import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PlatformEarningsTab = () => {
  const [earnings, setEarnings] = useState<any[]>([]);
  const [mpesaAttempts, setMpesaAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [earningsRes, mpesaRes] = await Promise.all([
        supabase.from("platform_earnings").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("mpesa_payment_attempts").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      setEarnings(earningsRes.data || []);
      setMpesaAttempts(mpesaRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke("reconcile-mpesa", {
        body: { action: "timeout_stale" },
      });
      if (error) throw error;
      toast.success(`Reconciled: ${data?.timed_out || 0} stale payments marked as timeout`);
      // Refresh
      const { data: fresh } = await supabase.from("mpesa_payment_attempts").select("*").order("created_at", { ascending: false }).limit(100);
      setMpesaAttempts(fresh || []);
    } catch (err: any) {
      toast.error(err.message || "Reconciliation failed");
    } finally { setReconciling(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  const total = earnings.reduce((s, e) => s + Number(e.amount), 0);
  const bySource: Record<string, number> = {};
  earnings.forEach((e) => {
    bySource[e.source_type] = (bySource[e.source_type] || 0) + Number(e.amount);
  });

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const daily = earnings.filter((e) => e.created_at?.slice(0, 10) === todayStr).reduce((s, e) => s + Number(e.amount), 0);
  const weekly = earnings.filter((e) => new Date(e.created_at) >= weekAgo).reduce((s, e) => s + Number(e.amount), 0);
  const monthly = earnings.filter((e) => new Date(e.created_at) >= monthAgo).reduce((s, e) => s + Number(e.amount), 0);

  // M-Pesa stats
  const mpesaSuccessful = mpesaAttempts.filter(a => a.status === "success");
  const mpesaPending = mpesaAttempts.filter(a => ["initiated", "pending"].includes(a.status));
  const mpesaFailed = mpesaAttempts.filter(a => ["failed", "cancelled", "timeout"].includes(a.status));
  const mpesaTopups = mpesaSuccessful.filter(a => a.purpose === "wallet_topup");
  const mpesaErrandPays = mpesaSuccessful.filter(a => a.purpose === "errand_payment");
  const totalMpesaTopups = mpesaTopups.reduce((s, a) => s + Number(a.amount), 0);
  const totalMpesaErrandPays = mpesaErrandPays.reduce((s, a) => s + Number(a.total_amount), 0);

  const statusColor = (s: string) => {
    if (s === "success") return "bg-emerald-light text-primary";
    if (s === "pending" || s === "initiated") return "bg-accent/10 text-accent";
    return "bg-destructive/10 text-destructive";
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Platform Earnings */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-2xl"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Earnings</p>
          <p className="text-lg font-bold text-foreground">KES {total.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-lg font-bold text-foreground">KES {daily.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">This Week</p>
          <p className="text-lg font-bold text-foreground">KES {weekly.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">This Month</p>
          <p className="text-lg font-bold text-foreground">KES {monthly.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">By Source</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {Object.entries(bySource).map(([source, amt]) => (
            <div key={source} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground capitalize">{source.replace(/_/g, " ")}</span>
              <span className="text-sm font-semibold text-foreground">KES {amt.toLocaleString()}</span>
            </div>
          ))}
          {Object.keys(bySource).length === 0 && <p className="text-xs text-muted-foreground">No earnings recorded yet</p>}
        </CardContent>
      </Card>

      {/* M-Pesa Section */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-primary" /> M-Pesa Payments
        </h3>
        <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={handleReconcile} disabled={reconciling}>
          {reconciling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reconcile Stale"}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="rounded-2xl"><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Successful</p>
          <p className="text-sm font-bold text-foreground">{mpesaSuccessful.length}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Pending</p>
          <p className="text-sm font-bold text-accent">{mpesaPending.length}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Failed/Cancelled</p>
          <p className="text-sm font-bold text-destructive">{mpesaFailed.length}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">M-Pesa Topups</p>
          <p className="text-sm font-bold text-foreground">KES {totalMpesaTopups.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">M-Pesa Errand Pays</p>
          <p className="text-sm font-bold text-foreground">KES {totalMpesaErrandPays.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      {/* Recent M-Pesa attempts */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Recent M-Pesa Attempts</h3>
        {mpesaAttempts.slice(0, 20).map((a) => (
          <Card key={a.id} className="rounded-xl border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusColor(a.status)}`}>{a.status}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{a.purpose?.replace(/_/g, " ")}</span>
                </div>
                <p className="text-sm font-semibold text-foreground">KES {Number(a.total_amount).toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{a.phone_number}</span>
                <span>{a.mpesa_receipt_number || "—"}</span>
                <span>{new Date(a.created_at).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {mpesaAttempts.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No M-Pesa payments yet</p>}
      </div>

      {/* Recent platform earnings */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Recent Earnings</h3>
        {earnings.slice(0, 20).map((e) => (
          <Card key={e.id} className="rounded-xl border-border">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground capitalize">{e.source_type.replace(/_/g, " ")}</p>
                <p className="text-[10px] text-muted-foreground">{e.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">KES {Number(e.amount).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlatformEarningsTab;
