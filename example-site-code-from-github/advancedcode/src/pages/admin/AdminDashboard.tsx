import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Users, Clock, Wallet, FileText, AlertTriangle, TrendingUp, Package, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PendingRunners from "@/components/admin/PendingRunners";
import WithdrawalsTab from "@/components/admin/WithdrawalsTab";
import UsersTab from "@/components/admin/UsersTab";
import AuditLogsTab from "@/components/admin/AuditLogsTab";
import DisputesTab from "@/components/admin/DisputesTab";
import PlatformEarningsTab from "@/components/admin/PlatformEarningsTab";
import ManualPaymentsTab from "@/components/admin/ManualPaymentsTab";

const AdminDashboard = () => {
  const { user, roles, loading: authLoading } = useAuth();
  const isAdmin = roles.includes("admin");
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const [earningsRes, withdrawalsRes, disputesRes, errandsRes] = await Promise.all([
        supabase.from("platform_earnings").select("amount, source_type, created_at"),
        supabase.from("runner_withdrawals").select("amount, status"),
        supabase.from("disputes").select("status"),
        supabase.from("errands").select("status, total_amount, created_at").order("created_at", { ascending: false }).limit(50),
      ]);

      const allEarnings = earningsRes.data || [];
      const totalEarnings = allEarnings.reduce((s: number, e: any) => s + Number(e.amount), 0);
      const txFees = allEarnings.filter((e: any) => e.source_type === "transaction_fee").reduce((s: number, e: any) => s + Number(e.amount), 0);
      const runnerFees = allEarnings.filter((e: any) => e.source_type === "runner_platform_fee").reduce((s: number, e: any) => s + Number(e.amount), 0);

      const allWithdrawals = withdrawalsRes.data || [];
      const pendingW = allWithdrawals.filter((w: any) => ["pending", "approved"].includes(w.status));
      const paidW = allWithdrawals.filter((w: any) => w.status === "paid");

      const allDisputes = disputesRes.data || [];
      const openDisputes = allDisputes.filter((d: any) => ["open", "under_review"].includes(d.status));

      setStats({
        totalEarnings, txFees, runnerFees,
        pendingWithdrawals: pendingW.reduce((s: number, w: any) => s + Number(w.amount), 0),
        pendingWithdrawalCount: pendingW.length,
        paidWithdrawals: paidW.reduce((s: number, w: any) => s + Number(w.amount), 0),
        openDisputeCount: openDisputes.length,
        totalErrands: (errandsRes.data || []).length,
      });
    };
    load();
  }, [isAdmin]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-emerald flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">Tumame management panel</p>
          </div>
        </div>

        {/* Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Platform Earnings", value: `KES ${stats.totalEarnings.toLocaleString()}`, icon: TrendingUp, color: "text-primary", bg: "bg-emerald-light" },
              { label: "Pending Payouts", value: `${stats.pendingWithdrawalCount}`, icon: Wallet, color: "text-accent", bg: "bg-accent/10" },
              { label: "Open Disputes", value: `${stats.openDisputeCount}`, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
              { label: "Recent Errands", value: `${stats.totalErrands}`, icon: Package, color: "text-primary", bg: "bg-primary/10" },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-2xl bg-card border border-border shadow-premium">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="runners" className="w-full">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-7 h-11 rounded-xl bg-muted">
            <TabsTrigger value="runners" className="rounded-lg text-xs gap-1"><Clock className="w-3 h-3" /> Runners</TabsTrigger>
            <TabsTrigger value="manual" className="rounded-lg text-xs gap-1"><CreditCard className="w-3 h-3" /> Manual</TabsTrigger>
            <TabsTrigger value="withdrawals" className="rounded-lg text-xs gap-1"><Wallet className="w-3 h-3" /> Payouts</TabsTrigger>
            <TabsTrigger value="disputes" className="rounded-lg text-xs gap-1"><AlertTriangle className="w-3 h-3" /> Disputes</TabsTrigger>
            <TabsTrigger value="earnings" className="rounded-lg text-xs gap-1"><TrendingUp className="w-3 h-3" /> Earnings</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg text-xs gap-1"><Users className="w-3 h-3" /> Users</TabsTrigger>
            <TabsTrigger value="logs" className="rounded-lg text-xs gap-1"><FileText className="w-3 h-3" /> Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="runners"><PendingRunners /></TabsContent>
          <TabsContent value="manual"><ManualPaymentsTab /></TabsContent>
          <TabsContent value="withdrawals"><WithdrawalsTab /></TabsContent>
          <TabsContent value="disputes"><DisputesTab /></TabsContent>
          <TabsContent value="earnings"><PlatformEarningsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="logs"><AuditLogsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
