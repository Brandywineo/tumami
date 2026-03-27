import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Phone, User, CheckCircle, Loader2, ShieldAlert, AlertTriangle, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateRunnerPayout, PAYMENT_SAFETY_SHORT, RUNNER_PAYMENT_RULE } from "@/lib/pricing";
import { motion, AnimatePresence } from "framer-motion";

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

  const isRunner = roles.includes("runner");
  const isCustomer = !isRunner || errand?.customer_id === user?.id;

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([
      supabase.from("errands").select("*").eq("id", id).single(),
      supabase.from("wallet_accounts").select("balance").eq("user_id", user.id).single(),
    ]).then(([{ data: e }, { data: w }]) => {
      setErrand(e);
      setWalletBalance(w?.balance || 0);
      setLoading(false);
    });
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
      if (disputeType === "payment") {
        setErrand({ ...errand, notes: (errand.notes || "") + " [DISPUTED]" });
      }
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

          {/* Client view: Transaction Fee */}
          {isCustomer && (
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee</span>
                <span className="font-medium">KES {baseAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction Fee (5%)</span>
                <span className="font-medium">KES {Number(errand.platform_fee).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
                <span>Total Paid</span>
                <span className="text-primary">KES {Number(errand.total_amount).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Runner view: Platform Fee */}
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

          {/* Direct merchant payment note */}
          {errand.payment_method === "direct_merchant_payment" && (
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 flex gap-2 text-xs text-accent">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Pay the merchant directly through their official till number, paybill, or verified business payment method. Do not send money to a runner's personal number.</span>
            </div>
          )}
        </div>

        {/* Wallet payment option for unpaid errands */}
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

        {/* Payment safety guidance */}
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

        {/* Confirm completion */}
        {(errand.status === "in_progress" || errand.status === "awaiting_confirmation") && errand.customer_id === user?.id && (
          <Button className="w-full h-12 rounded-xl font-semibold gap-2" onClick={confirmCompletion} disabled={confirming}>
            {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</> : <><CheckCircle className="w-4 h-4" /> Confirm Completion</>}
          </Button>
        )}

        {/* Raise Dispute */}
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
      </div>
    </AppLayout>
  );
};

export default ErrandDetail;
