import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, ArrowDown, X, Loader2, TrendingUp, Calendar, Award, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type TxFilter = "all" | "topup" | "errand_payment" | "withdrawal" | "earning" | "adjustment" | "refund";

const WalletPage = ({ type = "customer" }: { type?: "customer" | "runner" }) => {
  const { user, verificationStatus } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [manualPayments, setManualPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState<"topup" | "withdraw" | null>(null);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [txFilter, setTxFilter] = useState<TxFilter>("all");
  const [submitting, setSubmitting] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const isApprovedRunner = type === "runner" && verificationStatus === "verified";

  const loadData = async () => {
    if (!user) return;
    const promises: any[] = [
      supabase.from("wallet_accounts").select("*").eq("user_id", user.id).single(),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("manual_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ];
    if (type === "runner") {
      promises.push(supabase.from("runner_withdrawals").select("*").eq("user_id", user.id).order("requested_at", { ascending: false }).limit(20));
    } else {
      promises.push(supabase.from("withdrawal_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20));
    }
    const results = await Promise.all(promises);
    setWallet(results[0].data);
    setTransactions(results[1].data || []);
    setManualPayments(results[2].data || []);
    setWithdrawals(results[3]?.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadData();

    // Realtime subscriptions for live updates
    const walletChannel = supabase
      .channel("wallet-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_accounts", filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.new) setWallet(payload.new);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${user.id}` }, () => {
        supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
          .then(({ data }) => setTransactions(data || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "manual_payments", filter: `user_id=eq.${user.id}` }, () => {
        supabase.from("manual_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
          .then(({ data }) => setManualPayments(data || []));
      })
      .subscribe();

    return () => { supabase.removeChannel(walletChannel); };
  }, [user, type]);

  const handleTopUp = () => {
    if (!amount || Number(amount) <= 0) return;
    navigate("/customer/mpesa-pay", {
      state: { amount: Number(amount), title: "Wallet Top Up", purpose: "wallet_topup" },
    });
  };

  const openWithdrawSheet = () => {
    setActiveSheet("withdraw");
    setAmount("");
    setPhone("");
    if (type === "customer" && (wallet?.balance || 0) < 500) {
      toast.error("Minimum withdrawal amount is KES 500");
    }
  };

  const handleWithdraw = async () => {
    if (!user || !amount || !phone) return;
    const amt = Number(amount);
    if (amt < 500) { toast.error("Minimum withdrawal amount is KES 500"); return; }
    if (amt > (wallet?.balance || 0)) { toast.error("Insufficient balance"); return; }
    setSubmitting(true);
    try {
      if (type === "runner") {
        const { error } = await supabase.from("runner_withdrawals").insert({
          user_id: user.id, amount: amt, payout_method: "mpesa", payout_details: { phone },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("withdrawal_requests").insert({
          user_id: user.id, amount: amt, phone,
        });
        if (error) throw error;
      }
      toast.success("Withdrawal request submitted for review");
      setActiveSheet(null);
      setAmount("");
      setPhone("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
    } finally { setSubmitting(false); }
  };

  // Merge manual payments into transaction-like display
  const allItems = [
    ...transactions.map(t => ({ ...t, _type: "transaction" as const })),
    ...manualPayments.map(mp => ({
      id: mp.id,
      created_at: mp.created_at,
      amount: mp.amount,
      direction: "credit",
      type: "topup",
      transaction_type: "topup",
      description: `Manual M-Pesa Deposit — ${mp.mpesa_code}`,
      status: mp.status,
      _type: "manual_payment" as const,
      _mpesaCode: mp.mpesa_code,
      _purpose: mp.purpose,
      _adminNote: mp.admin_note,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filtered = allItems.filter(t => {
    if (txFilter === "all") return true;
    return t.transaction_type === txFilter || t.type === txFilter;
  });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const earnings = transactions.filter(t => t.transaction_type === "earning" || t.type === "earning");
  const weekEarnings = earnings.filter(t => new Date(t.created_at) >= weekAgo).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const monthEarnings = earnings.filter(t => new Date(t.created_at) >= monthStart).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const totalEarnings = earnings.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === "paid" || w.status === "successful").reduce((s, w) => s + Number(w.amount), 0);

  const filters: { key: TxFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "topup", label: "Deposits" },
    { key: "errand_payment", label: "Payments" },
    { key: "earning", label: "Earnings" },
    { key: "withdrawal", label: "Withdrawals" },
    { key: "refund", label: "Refunds" },
    { key: "adjustment", label: "Adjustments" },
  ];

  const getStatusBadge = (item: any) => {
    if (item._type === "manual_payment") {
      if (item.status === "pending") return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent"><Clock className="w-2.5 h-2.5" />Pending</span>;
      if (item.status === "approved") return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-light text-primary"><CheckCircle className="w-2.5 h-2.5" />Approved</span>;
      if (item.status === "rejected") return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive"><XCircle className="w-2.5 h-2.5" />Rejected</span>;
    }
    return null;
  };

  if (loading) {
    return <AppLayout type={type}><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout type={type}>
      <div className="space-y-6">
        <h1 className="text-xl font-display font-bold text-foreground">Wallet</h1>

        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-gradient-emerald text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/10 blur-2xl" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center mx-auto mb-3">
              <WalletIcon className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="text-sm text-primary-foreground/60 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-primary-foreground mb-1">KES {(wallet?.balance || 0).toLocaleString()}</p>
            {type === "runner" && <p className="text-sm text-primary-foreground/50 mt-1">Pending: KES {(wallet?.pending_balance || 0).toLocaleString()}</p>}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button onClick={() => { setActiveSheet("topup"); setAmount(""); }} className="h-14 rounded-2xl font-semibold gap-2 text-base">
            <Plus className="w-5 h-5" /> Top Up
          </Button>
          {(type === "customer" || isApprovedRunner) ? (
            <Button onClick={openWithdrawSheet} variant="outline" className="h-14 rounded-2xl font-semibold gap-2 text-base border-2">
              <ArrowDown className="w-5 h-5" /> Withdraw
            </Button>
          ) : (
            <Button variant="outline" disabled className="h-14 rounded-2xl font-semibold gap-2 text-base border-2 opacity-50">
              <ArrowDown className="w-5 h-5" /> Withdraw
            </Button>
          )}
        </div>

        {/* Top Up / Withdraw Sheet */}
        <AnimatePresence>
          {activeSheet && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-5 rounded-2xl bg-card border border-border shadow-premium space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground text-sm">{activeSheet === "topup" ? "Top Up via M-Pesa" : "Withdraw to M-Pesa"}</p>
                  <button onClick={() => setActiveSheet(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>

                {activeSheet === "topup" && (
                  <div className="p-2.5 rounded-lg bg-emerald-light/50 border border-primary/10">
                    <p className="text-xs text-primary font-medium">✓ No platform fee — full amount credited to your wallet.</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">The 5% transaction fee only applies when paying for errands.</p>
                  </div>
                )}

                {activeSheet === "withdraw" && (
                  <>
                    <div className="p-2.5 rounded-lg bg-accent/5 border border-accent/10 flex gap-2">
                      <AlertCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-accent font-medium">Minimum withdrawal: KES 500</p>
                        <p className="text-[10px] text-muted-foreground">Available: KES {(wallet?.balance || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>M-Pesa Phone Number</Label>
                      <Input placeholder="0712345678" value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl" />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input type="number" placeholder={activeSheet === "withdraw" ? "500" : "1000"} value={amount} onChange={e => setAmount(e.target.value)} className="h-12 rounded-xl text-lg font-semibold" />
                </div>
                <div className="flex gap-2">
                  {["500", "1000", "2000", "5000"].map(a => (
                    <button key={a} onClick={() => setAmount(a)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${amount === a ? "bg-primary text-primary-foreground" : "bg-emerald-light text-primary hover:bg-primary/10"}`}>
                      {Number(a).toLocaleString()}
                    </button>
                  ))}
                </div>

                {activeSheet === "withdraw" && Number(amount) > 0 && Number(amount) < 500 && (
                  <p className="text-xs text-destructive">Minimum withdrawal amount is KES 500</p>
                )}
                {activeSheet === "withdraw" && Number(amount) > (wallet?.balance || 0) && (
                  <p className="text-xs text-destructive">Amount exceeds available balance</p>
                )}

                <Button className="w-full h-12 rounded-xl font-semibold"
                  disabled={!amount || Number(amount) <= 0 || submitting || (activeSheet === "withdraw" && (Number(amount) < 500 || Number(amount) > (wallet?.balance || 0) || !phone))}
                  onClick={activeSheet === "topup" ? handleTopUp : handleWithdraw}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : activeSheet === "topup" ? "Pay via M-Pesa" : "Request Withdrawal"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Runner Stats */}
        {type === "runner" && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "This Week", value: weekEarnings, icon: TrendingUp },
              { label: "This Month", value: monthEarnings, icon: Calendar },
              { label: "Total Earned", value: totalEarnings, icon: Award },
              { label: "Withdrawn", value: totalWithdrawn, icon: ArrowDown },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-2xl bg-card border border-border shadow-premium text-center">
                <s.icon className="w-4 h-4 text-accent mx-auto mb-1" />
                <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
                <p className="text-sm font-bold text-foreground">KES {s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* Withdrawal History */}
        {withdrawals.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Withdrawal Requests</h2>
            <div className="space-y-2">
              {withdrawals.map(w => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">KES {Number(w.amount).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(w.requested_at || w.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                    w.status === "successful" || w.status === "paid" ? "bg-emerald-light text-primary" :
                    w.status === "approved" ? "bg-primary/10 text-primary" :
                    w.status === "rejected" ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>{w.status === "successful" ? "Completed" : w.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction Filters */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Transactions</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {filters.map(f => (
              <button key={f.key} onClick={() => setTxFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${txFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        {filtered.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <WalletIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t, i) => {
              const isCredit = t.direction === "credit" || Number(t.amount) > 0;
              const isManualPending = t._type === "manual_payment" && t.status === "pending";
              const isManualRejected = t._type === "manual_payment" && t.status === "rejected";
              
              return (
                <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.3 }}
                  className={`flex items-center gap-3 p-4 rounded-2xl bg-card border shadow-premium ${isManualPending ? "border-accent/30" : isManualRejected ? "border-destructive/20" : "border-border"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isManualPending ? "bg-accent/10" : isManualRejected ? "bg-destructive/10" : isCredit ? "bg-emerald-light" : "bg-accent/10"
                  }`}>
                    {isManualPending ? <Clock className="w-4 h-4 text-accent" /> :
                     isManualRejected ? <XCircle className="w-4 h-4 text-destructive" /> :
                     isCredit ? <ArrowDownLeft className="w-4 h-4 text-primary" /> : <ArrowUpRight className="w-4 h-4 text-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{t.description || t.type}</p>
                      {getStatusBadge(t)}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()} · {t.transaction_type || t.type}</p>
                    {t._type === "manual_payment" && t._adminNote && t.status === "rejected" && (
                      <p className="text-[10px] text-destructive mt-0.5">Reason: {t._adminNote}</p>
                    )}
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${
                    isManualPending ? "text-accent" : isManualRejected ? "text-destructive line-through" : isCredit ? "text-primary" : "text-foreground"
                  }`}>
                    {isCredit ? "+" : "-"}KES {Math.abs(Number(t.amount)).toLocaleString()}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default WalletPage;
