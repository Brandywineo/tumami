import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus, Package, CheckCircle, Clock, Wallet, ArrowRight, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const statusStyles: Record<string, string> = {
  pending_payment: "bg-destructive/10 text-destructive",
  paid: "bg-accent/10 text-accent",
  open: "bg-accent/10 text-accent",
  assigned: "bg-primary/10 text-primary",
  in_progress: "bg-primary/10 text-primary",
  awaiting_confirmation: "bg-accent/15 text-accent",
  completed: "bg-emerald-light text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  pending_payment: "Pending Payment", paid: "Paid", open: "Open", assigned: "Assigned",
  in_progress: "In Progress", awaiting_confirmation: "Awaiting Confirmation",
  completed: "Completed", cancelled: "Cancelled",
};


const CustomerDashboard = () => {
  const { user, profile } = useAuth();
  const [errands, setErrands] = useState<any[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; pending_balance: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [errandsRes, walletRes] = await Promise.all([
        supabase.from("errands").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("wallet_accounts").select("balance, pending_balance").eq("user_id", user.id).single(),
      ]);
      setErrands(errandsRes.data || []);
      setWallet(walletRes.data);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const activeCount = errands.filter(e => ["paid", "assigned", "in_progress"].includes(e.status)).length;
  const completedCount = errands.filter(e => e.status === "completed").length;
  const pendingCount = errands.filter(e => ["pending_payment", "awaiting_confirmation"].includes(e.status)).length;

  const stats = [
    { label: "Active", value: String(activeCount), icon: Package, color: "text-primary", bg: "bg-emerald-light" },
    { label: "Completed", value: String(completedCount), icon: CheckCircle, color: "text-accent", bg: "bg-accent/10" },
    { label: "Pending", value: String(pendingCount), icon: Clock, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Wallet", value: `KES ${(wallet?.balance || 0).toLocaleString()}`, icon: Wallet, color: "text-primary", bg: "bg-emerald-light" },
  ];

  if (loading) {
    return (
      <AppLayout type="customer">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout type="customer">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Hey, {profile?.full_name?.split(" ")[0] || "there"} 👋</h1>
          <p className="text-sm text-muted-foreground">What do you need done today?</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link to="/customer/post-errand" className="block p-6 rounded-2xl bg-gradient-emerald shadow-premium hover:shadow-gold transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-foreground/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-foreground/25 transition-colors">
                <Plus className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-primary-foreground">Post a New Errand</h2>
                <p className="text-sm text-primary-foreground/65">Get it done by a trusted runner</p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary-foreground/50 group-hover:text-primary-foreground transition-colors" />
            </div>
          </Link>
        </motion.div>


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

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Errands</h2>
            <Link to="/customer/errands" className="text-xs text-primary font-medium">View all</Link>
          </div>
          {errands.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No errands yet. Post your first errand!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {errands.map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}>
                  <Link to={`/customer/errand/${e.id}`} className="block p-4 rounded-2xl bg-card border border-border shadow-premium hover:border-primary/20 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-foreground text-sm flex-1 mr-2">{e.title}</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${statusStyles[e.status]}`}>
                        {statusLabels[e.status]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">KES {Number(e.total_amount).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default CustomerDashboard;
