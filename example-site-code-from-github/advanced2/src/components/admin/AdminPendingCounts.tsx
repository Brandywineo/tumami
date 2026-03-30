import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, CreditCard, Wallet, AlertTriangle, Package, Bell, UserPlus, Activity } from "lucide-react";

interface PendingCounts {
  pendingRunners: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  openDisputes: number;
  activeErrands: number;
  unreadNotifications: number;
  newUsersToday: number;
  flaggedErrands: number;
}

interface Props {
  onTabChange?: (tab: string) => void;
}

const AdminPendingCounts = ({ onTabChange }: Props) => {
  const [counts, setCounts] = useState<PendingCounts>({
    pendingRunners: 0, pendingDeposits: 0, pendingWithdrawals: 0,
    openDisputes: 0, activeErrands: 0, unreadNotifications: 0,
    newUsersToday: 0, flaggedErrands: 0,
  });

  const fetchCounts = async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [runners, deposits, withdrawals, rwDrawals, disputes, errands, notifs, newUsers] = await Promise.all([
      supabase.from("runner_verifications").select("id", { count: "exact", head: true }).eq("status", "under_review"),
      supabase.from("manual_payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("runner_withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
      supabase.from("errands").select("id", { count: "exact", head: true }).in("status", ["assigned", "in_progress"]),
      supabase.from("admin_notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
    ]);

    setCounts({
      pendingRunners: runners.count || 0,
      pendingDeposits: deposits.count || 0,
      pendingWithdrawals: (withdrawals.count || 0) + (rwDrawals.count || 0),
      openDisputes: disputes.count || 0,
      activeErrands: errands.count || 0,
      unreadNotifications: notifs.count || 0,
      newUsersToday: newUsers.count || 0,
      flaggedErrands: 0,
    });
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);

    // Realtime for key tables
    const channel = supabase.channel("admin-counts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "runner_verifications" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "manual_payments" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "runner_withdrawals" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "disputes" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_notifications" }, fetchCounts)
      .subscribe();

    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);

  const cards = [
    { label: "Pending Runners", value: counts.pendingRunners, icon: Users, tab: "runners", color: "text-accent", bg: "bg-accent/10", urgent: counts.pendingRunners > 0 },
    { label: "Pending Deposits", value: counts.pendingDeposits, icon: CreditCard, tab: "manual", color: "text-primary", bg: "bg-primary/10", urgent: counts.pendingDeposits > 0 },
    { label: "Pending Payouts", value: counts.pendingWithdrawals, icon: Wallet, tab: "withdrawals", color: "text-accent", bg: "bg-accent/10", urgent: counts.pendingWithdrawals > 0 },
    { label: "Open Disputes", value: counts.openDisputes, icon: AlertTriangle, tab: "disputes", color: "text-destructive", bg: "bg-destructive/10", urgent: counts.openDisputes > 0 },
    { label: "Active Errands", value: counts.activeErrands, icon: Package, tab: "errands", color: "text-primary", bg: "bg-emerald-light" },
    { label: "Unread Alerts", value: counts.unreadNotifications, icon: Bell, tab: "", color: "text-accent", bg: "bg-accent/10", urgent: counts.unreadNotifications > 0 },
    { label: "New Users Today", value: counts.newUsersToday, icon: UserPlus, tab: "users", color: "text-primary", bg: "bg-primary/10" },
    { label: "System Status", value: "OK", icon: Activity, tab: "logs", color: "text-primary", bg: "bg-emerald-light" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {cards.map(c => (
        <button
          key={c.label}
          onClick={() => c.tab && onTabChange?.(c.tab)}
          className={`p-3 rounded-2xl bg-card border transition-all text-left ${c.urgent ? "border-destructive/30 shadow-md" : "border-border shadow-premium"} hover:border-primary/30`}
        >
          <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center mb-1.5`}>
            <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
          </div>
          <p className="text-[10px] text-muted-foreground">{c.label}</p>
          <p className={`text-base font-bold ${c.urgent ? "text-destructive" : "text-foreground"}`}>
            {c.value}
          </p>
        </button>
      ))}
    </div>
  );
};

export default AdminPendingCounts;
