import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Phone, User, CheckCircle, Loader2, ShieldAlert, AlertTriangle, Wallet, Star, MessageCircle, Heart, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateRunnerPayout, PAYMENT_SAFETY_SHORT, RUNNER_PAYMENT_RULE } from "@/lib/pricing";
import { motion, AnimatePresence } from "framer-motion";
import RatingDialog from "@/components/runner/RatingDialog";

const statusLabels: Record<string, string> = {
  pending_payment: "Pending Payment", paid: "Paid", open: "Open", assigned: "Assigned",
  in_progress: "In Progress", awaiting_confirmation: "Awaiting Confirmation",
  completed: "Completed", cancelled: "Cancelled",
};

const statusStyles: Record<string, string> = {
  pending_payment: "bg-destructive/10 text-destructive",
  paid: "bg-accent/10 text-accent", open: "bg-accent/10 text-accent",
  assigned: "bg-primary/10 text-primary", in_progress: "bg-primary/10 text-primary",
  awaiting_confirmation: "bg-accent/15 text-accent",
  completed: "bg-emerald-light text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

const shoppingTypes = ["personal_shopping", "gift_shopping", "grocery_shopping", "meal_delivery", "shop_check"];

const ErrandDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const [errand, setErrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeType, setDisputeType] = useState("service");
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [payingWallet, setPayingWallet] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [runnerProfile, setRunnerProfile] = useState<any>(null);
  const [activeDispute, setActiveDispute] = useState<any>(null);

  const isRunner = roles.includes("runner");
  const isCustomer = !isRunner || errand?.customer_id === user?.id;

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([
      supabase.from("errands").select("*").eq("id", id).single(),
      supabase.from("wallet_accounts").select("balance").eq("user_id", user.id).single(),
      supabase.from("disputes").select("*").eq("errand_id", id).in("status", ["open", "under_review"]).maybeSingle(),
    ]).then(async ([{ data: e }, { data: w }, { data: dispute }]) => {
      setErrand(e);
      setWalletBalance(w?.balance || 0);
      setActiveDispute(dispute);

      if (e?.runner_id) {
        const { data: rp } = await supabase.rpc("get_runner_profile", { p_runner_id: e.runner_id });
        if (rp && !(rp as any).error) setRunnerProfile(rp);

        const { data: rating } = await supabase.from("runner_ratings")
          .select("id").eq("errand_id", e.id).eq("client_id", user.id).maybeSingle();
        setHasRated(!!rating);
      }
      setLoading(false);
    });

    const channel = supabase
      .channel(`errand-detail-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "errands", filter: `id=eq.${id}` }, (payload) => {
        if (payload.new) {
          setErrand(payload.new);
          const newStatus = (payload.new as any).status;
          const oldStatus = (payload.old as any)?.status;
          if (newStatus !== oldStatus) {
            toast.info(`Errand status updated: ${statusLabels[newStatus] || newStatus}`);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  const confirmCompletion = async () => {
    if (!errand || !user) return;
    setConfirming(true);
    try {
      const { data: result, error } = await supabase.rpc("complete_errand", {
        p_errand_id: errand.id, p_user_id: user.id,
      });
      if (error) throw error;
      const res = result as any;
      if (!res?.success) throw new Error(res?.error || "Failed to complete");
      toast.success("Errand completed! Runner payout initiated.");
      setErrand({ ...errand, status: "completed" });
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm");
    } finally { setConfirming(false); }
  };

  const submitDispute = async () => {
    if (!user || !errand || !disputeReason.trim()) return;
    setSubmittingDispute(true);
    try {
      const { data: result, error } = await supabase.rpc("raise_dispute", {
        p_errand_id: errand.id,
        p_user_id: user.id,
        p_against_user_id: isCustomer ? errand.runner_id : errand.customer_id,
        p_dispute_type: disputeType,
        p_reason: disputeReason,
      });
      if (error) throw error;
      const res = result as any;
      if (!res?.success) throw new Error(res?.error || "Failed to raise dispute");
      toast.success("Dispute raised successfully");
      setShowDisputeForm(false);
      setDisputeReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to raise dispute");
    } finally { setSubmittingDispute(false); }
  };

  const payWithWallet = async () => {
    if (!errand || !user) return;
    setPayingWallet(true);
    try {
      const { data: result, error } = await supabase.rpc("pay_errand_from_wallet", {
        p_errand_id: errand.id, p_user_id: user.id,
      });
      if (error) throw error;
      const res = result as any;
      if (!res?.success) throw new Error(res?.error || "Payment failed");
      toast.success("Paid from wallet! Errand is now live.");
      setErrand({ ...errand, status: "open", errand_payment_status: "paid" });
    } catch (err: any) {
      toast.error(err.message || "Wallet payment failed");
    } finally { setPayingWallet(false); }
  };

  if (loading) {
    return <AppLayout type={isRunner ? "runner" : "customer"}><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div></AppLayout>;
  }
  if (!errand) {
    return <AppLayout type={isRunner ? "runner" : "customer"}><div className="p-8 text-center text-muted-foreground">Errand not found.</div></AppLayout>;
  }

  const baseAmount = Number(errand.base_amount);
  const payout = calculateRunnerPayout(baseAmount);
  const isShopping = shoppingTypes.includes(errand.service_type);
  const canPayWallet = walletBalance >= Number(errand.total_amount);

  return (
    <AppLayout type={isRunner ? "runner" : "customer"}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-display font-bold text-foreground">Errand Details</h1>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-premium space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="font-semibold text-foreground">{errand.title}</h2>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${statusStyles[errand.status] || "bg-muted text-muted-foreground"}`}>
              {statusLabels[errand.status] || errand.status}
            </span>
          </div>
          {errand.description && <p className="text-sm text-muted-foreground">{errand.description}</p>}

          <div className="space-y-3 pt-3 border-t border-border">
            {errand.pickup_location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-accent" />
                <span className="text-muted-foreground">Pickup:</span>
                <span className="font-medium text-foreground">{errand.pickup_location}</span>
              </div>
            )}
            {errand.dropoff_location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Dropoff:</span>
                <span className="font-medium text-foreground">{errand.dropoff_location}</span>
              </div>
            )}
          </div>

          {(errand.recipient_name || errand.recipient_phone) && (
            <div className="space-y-2 pt-3 border-t border-border">
              {errand.recipient_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="font-medium text-foreground">{errand.recipient_name}</span>
                </div>
              )}
              {errand.recipient_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium text-foreground">{errand.recipient_phone}</span>
                </div>
              )}
            </div>
          )}

          {isCustomer && (
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee</span>
                <span className="font-medium">KES {baseAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction Fee (5%)</span>
                <span className="font-medium">KES {Number(errand.transaction_fee_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
                <span>Total Paid</span>
                <span className="text-primary">KES {Number(errand.total_amount).toLocaleString()}</span>
              </div>
            </div>
          )}

          {isRunner && errand.runner_id === user?.id && (
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Amount</span>
                <span className="font-medium">KES {baseAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee (10%)</span>
                <span className="font-medium text-destructive">-KES {payout.platformFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
                <span>Net Payout</span>
                <span className="text-primary">KES {payout.netPayout.toLocaleString()}</span>
              </div>
            </div>
          )}

          {errand.payment_method === "direct_merchant_payment" && (
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 flex gap-2 text-xs text-accent">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Pay the merchant directly through their official till number, paybill, or verified business payment method. Do not send money to a runner's personal number.</span>
            </div>
          )}
        </div>

        {/* Active Dispute Banner */}
        {activeDispute && (
          <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">On Dispute</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive capitalize">{activeDispute.status.replace(/_/g, " ")}</span>
            </div>
            <p className="text-xs text-muted-foreground">{activeDispute.reason}</p>
            {activeDispute.escalation_deadline && activeDispute.status === "open" && (() => {
              const remaining = new Date(activeDispute.escalation_deadline).getTime() - Date.now();
              const mins = Math.max(0, Math.ceil(remaining / 60000));
              return (
                <div className="flex items-center gap-1.5 text-xs text-accent font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {remaining > 0 ? `${mins}m left for mutual resolution` : "Ready for admin escalation"}
                </div>
              );
            })()}
            {activeDispute.status === "under_review" && (
              <p className="text-xs text-primary font-medium">Admin is reviewing this dispute</p>
            )}
          </div>
        )}


        {errand.status === "completed" && errand.runner_id && isCustomer && runnerProfile && (
          <div className="p-4 rounded-2xl bg-card border border-border shadow-premium">
            <p className="text-xs text-muted-foreground mb-3">Runner who completed this errand</p>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(`/runner-profile/${errand.runner_id}`)} className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{(runnerProfile as any).full_name}</p>
                {(runnerProfile as any).username && <p className="text-xs text-muted-foreground">@{(runnerProfile as any).username}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                <span className="text-xs font-medium">{(runnerProfile as any).avg_rating}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1 rounded-xl gap-1" onClick={() => navigate(`/customer/messages?with=${errand.runner_id}`)}>
                <MessageCircle className="w-3.5 h-3.5" /> Message
              </Button>
              <Button size="sm" variant="outline" className="flex-1 rounded-xl gap-1" onClick={() => navigate(`/runner-profile/${errand.runner_id}`)}>
                <User className="w-3.5 h-3.5" /> Profile
              </Button>
              {!hasRated && (
                <Button size="sm" className="flex-1 rounded-xl gap-1" onClick={() => setShowRating(true)}>
                  <Star className="w-3.5 h-3.5" /> Rate
                </Button>
              )}
            </div>
          </div>
        )}

        {errand.status === "pending_payment" && isCustomer && (
          <div className="p-4 rounded-2xl bg-card border border-border shadow-premium space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Pay Now</h3>
            <div className="flex gap-2">
              <Button className="flex-1 h-11 rounded-xl gap-2 font-semibold" onClick={payWithWallet} disabled={payingWallet || !canPayWallet}>
                {payingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Wallet (KES {walletBalance.toLocaleString()})
              </Button>
              <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold"
                onClick={() => navigate("/customer/mpesa-pay", { state: { amount: errand.total_amount, title: errand.title, errandId: errand.id, purpose: "errand_payment" } })}>
                M-Pesa
              </Button>
            </div>
            {!canPayWallet && <p className="text-[10px] text-destructive">Insufficient wallet balance for wallet payment.</p>}
          </div>
        )}

        {isShopping && isCustomer && (
          <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 flex gap-2 text-xs text-accent">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{PAYMENT_SAFETY_SHORT}</span>
          </div>
        )}
        {isShopping && isRunner && errand.runner_id === user?.id && (
          <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 flex gap-2 text-xs text-accent">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{RUNNER_PAYMENT_RULE}</span>
          </div>
        )}

        {(errand.status === "in_progress" || errand.status === "awaiting_confirmation") && errand.customer_id === user?.id && (
          <Button className="w-full h-12 rounded-xl font-semibold gap-2" onClick={confirmCompletion} disabled={confirming}>
            {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</> : <><CheckCircle className="w-4 h-4" /> Confirm Completion</>}
          </Button>
        )}

        {/* Runner status update buttons */}
        {isRunner && errand.runner_id === user?.id && errand.status === "assigned" && (
          <Button className="w-full h-12 rounded-xl font-semibold gap-2" onClick={async () => {
            const { data, error } = await supabase.rpc("update_errand_status", {
              p_errand_id: errand.id, p_user_id: user!.id, p_new_status: "in_progress" as any,
            });
            if (error || !(data as any)?.success) toast.error((data as any)?.error || "Failed");
            else { toast.success("Started errand!"); setErrand({ ...errand, status: "in_progress" }); }
          }}>
            Start Errand
          </Button>
        )}

        {isRunner && errand.runner_id === user?.id && errand.status === "in_progress" && (
          <Button className="w-full h-12 rounded-xl font-semibold gap-2" onClick={async () => {
            const { data, error } = await supabase.rpc("update_errand_status", {
              p_errand_id: errand.id, p_user_id: user!.id, p_new_status: "awaiting_confirmation" as any,
            });
            if (error || !(data as any)?.success) toast.error((data as any)?.error || "Failed");
            else { toast.success("Marked as done. Waiting for client confirmation."); setErrand({ ...errand, status: "awaiting_confirmation" }); }
          }}>
            Mark as Done
          </Button>
        )}

        {["assigned", "in_progress", "awaiting_confirmation", "completed"].includes(errand.status) &&
          (errand.customer_id === user?.id || errand.runner_id === user?.id) && (
          <div>
            {!showDisputeForm ? (
              <Button variant="destructive" className="w-full h-11 rounded-xl font-semibold gap-2" onClick={() => setShowDisputeForm(true)}>
                <AlertTriangle className="w-4 h-4" /> Raise a Dispute
              </Button>
            ) : (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-4 rounded-2xl bg-card border border-border shadow-premium space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Raise a Dispute</h3>
                  <p className="text-xs text-muted-foreground">A 30-minute resolution window will start. Try to resolve it with the other party first. If no agreement, admin will step in.</p>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Dispute Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {["payment", "service", "fraud", "other"].map(t => (
                        <button key={t} onClick={() => setDisputeType(t)}
                          className={`py-2 rounded-xl text-xs font-medium capitalize transition-colors ${disputeType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Reason</Label>
                    <Textarea placeholder="Describe the issue..." value={disputeReason} onChange={e => setDisputeReason(e.target.value)} className="rounded-xl min-h-[80px] text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 rounded-xl" onClick={submitDispute} disabled={submittingDispute || !disputeReason.trim()}>
                      {submittingDispute ? <Loader2 className="w-3 h-3 animate-spin" /> : "Submit Dispute"}
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowDisputeForm(false)}>Cancel</Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Rating Dialog */}
        <AnimatePresence>
          {showRating && errand.runner_id && user && (
            <RatingDialog errandId={errand.id} runnerId={errand.runner_id} clientId={user.id}
              onClose={() => setShowRating(false)} onRated={() => setHasRated(true)} />
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default ErrandDetail;
