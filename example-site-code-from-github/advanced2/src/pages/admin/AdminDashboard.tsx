import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Users, Clock, Wallet, FileText, AlertTriangle, TrendingUp, Package, CreditCard, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RunnerApplicationReview from "@/components/admin/RunnerApplicationReview";
import WithdrawalsTab from "@/components/admin/WithdrawalsTab";
import UsersTab from "@/components/admin/UsersTab";
import AuditLogsTab from "@/components/admin/AuditLogsTab";
import DisputesTab from "@/components/admin/DisputesTab";
import PlatformEarningsTab from "@/components/admin/PlatformEarningsTab";
import ManualPaymentsTab from "@/components/admin/ManualPaymentsTab";
import ErrandsTab from "@/components/admin/ErrandsTab";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import AdminPendingCounts from "@/components/admin/AdminPendingCounts";

const AdminDashboard = () => {
  const { user, roles, loading: authLoading } = useAuth();
  const isAdmin = roles.includes("admin");
  const [activeTab, setActiveTab] = useState("runners");

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-emerald flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Tumame management panel</p>
            </div>
          </div>
          <AdminNotificationBell />
        </div>

        {/* Live pending counts */}
        <AdminPendingCounts onTabChange={setActiveTab} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 sm:grid-cols-8 h-11 rounded-xl bg-muted">
            <TabsTrigger value="runners" className="rounded-lg text-xs gap-1"><Clock className="w-3 h-3" /> Runners</TabsTrigger>
            <TabsTrigger value="errands" className="rounded-lg text-xs gap-1"><ClipboardList className="w-3 h-3" /> Errands</TabsTrigger>
            <TabsTrigger value="manual" className="rounded-lg text-xs gap-1"><CreditCard className="w-3 h-3" /> Manual</TabsTrigger>
            <TabsTrigger value="withdrawals" className="rounded-lg text-xs gap-1"><Wallet className="w-3 h-3" /> Payouts</TabsTrigger>
            <TabsTrigger value="disputes" className="rounded-lg text-xs gap-1"><AlertTriangle className="w-3 h-3" /> Disputes</TabsTrigger>
            <TabsTrigger value="earnings" className="rounded-lg text-xs gap-1"><TrendingUp className="w-3 h-3" /> Earnings</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg text-xs gap-1"><Users className="w-3 h-3" /> Users</TabsTrigger>
            <TabsTrigger value="logs" className="rounded-lg text-xs gap-1"><FileText className="w-3 h-3" /> Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="runners"><RunnerApplicationReview /></TabsContent>
          <TabsContent value="errands"><ErrandsTab /></TabsContent>
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
