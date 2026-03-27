import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Package, CheckCircle, Wallet, Clock, Shield, ArrowRight, Loader2, MapPin, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateRunnerPayout, RUNNER_PAYMENT_RULE } from "@/lib/pricing";

const RunnerDashboard = () => {
  const { user, profile } = useAuth();
  const [available, setAvailable] = useState<any[]>([]);
  const [myErrands, setMyErrands] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [avRes, myRes, wRes] = await Promise.all([
        supabase.from("errands").select("*").in("status", ["paid", "open"]).order("created_at", { ascending: false }).limit(10),
        supabase.from("errands").select("*").eq("runner_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("wallet_accounts").select("balance, pending_balance").eq("user_id", user.id).single(),
      ]);
      setAvailable(avRes.data || []);
      setMyErrands(myRes.data || []);
      setWallet(wRes.data);
      setLoading(false);
    };
    load();
  }, [user]);

  const acceptErrand = async (errandId: string) => {
    if (!user) return;
    setAccepting(errandId);
    try {
      const { error } = await supabase.from("errands").update({
        runner_id: user.id, status: "assigned" as const,
      }).eq("id", errandId);
      if (error) throw error;
      await supabase.from("errand_status_history").insert({
        errand_id: errandId, status: "assigned" as const, changed_by: user.id,
      });
      toast.success("Errand accepted!");
      setAvailable(prev => prev.filter(e => e.id !== errandId));
    } catch (err: any) {
      toast.error(err.message || "Failed to accept");
    } finally { setAccepting(null); }
  };

  const activeCount = myErrands.filter(e => ["assigned", "in_progress"].includes(e.status)).length;
  const completedCount = myErrands.filter(e => e.status === "completed").length;

  const stats = [
    { label: "Available", value: String(available.length), icon: Package, color: "text-accent", bg: "bg-accent/10" },
    { label: "Active", value: String(activeCount), icon: Clock, color: "text-primary", bg: "bg-emerald-light" },
    { label: "Completed", value: String(completedCount), icon: CheckCircle, color: "text-primary", bg: "bg-emerald-light" },
    { label: "Earnings", value: `KES ${(wallet?.balance || 0).toLocaleString()}`, icon: Wallet, color: "text-accent", bg: "bg-accent/10" },
  ];

  if (loading) {
    return <AppLayout type="runner"><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout type="runner">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Hey, {profile?.full_name?.split(" ")[0] || "Runner"} 🏃</h1>
            <p className="text-sm text-muted-foreground">Ready to earn today?</p>
          </div>
          <Link to="/runner/verification" className="text-xs font-medium text-primary bg-emerald-light px-3 py-1.5 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3" /> Status
          </Link>
        </div>

        {/* Runner payment rule */}
        <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 flex gap-2 text-xs text-accent">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{RUNNER_PAYMENT_RULE}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }} className="p-4 rounded-2xl bg-card border border-border shadow-premium">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Available Errands */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Available Errands</h2>
          {available.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No available errands right now. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {available.map((e, i) => {
                const payout = calculateRunnerPayout(Number(e.base_amount));
                return (
                  <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }} className="p-4 rounded-2xl bg-card border border-border shadow-premium">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <h3 className="font-medium text-foreground text-sm truncate">{e.title}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{e.pickup_location || e.dropoff_location || "—"}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold text-primary">KES {payout.netPayout.toLocaleString()}</span>
                        <p className="text-[10px] text-muted-foreground">net payout</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded-full">{e.service_type?.replace(/_/g, " ")}</span>
                      <Button size="sm" className="rounded-xl font-semibold gap-1 h-9" onClick={() => acceptErrand(e.id)} disabled={accepting === e.id}>
                        {accepting === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Accept <ArrowRight className="w-3 h-3" /></>}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default RunnerDashboard;
