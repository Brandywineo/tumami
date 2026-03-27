import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Link } from "react-router-dom";
import { Loader2, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const statusStyles: Record<string, string> = {
  pending_payment: "bg-destructive/10 text-destructive",
  paid: "bg-accent/10 text-accent",
  assigned: "bg-primary/10 text-primary",
  in_progress: "bg-primary/10 text-primary",
  awaiting_confirmation: "bg-accent/15 text-accent",
  completed: "bg-emerald-light text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  pending_payment: "Pending Payment", paid: "Paid", assigned: "Assigned",
  in_progress: "In Progress", awaiting_confirmation: "Awaiting Confirmation",
  completed: "Completed", cancelled: "Cancelled",
};

const CustomerErrands = () => {
  const { user } = useAuth();
  const [errands, setErrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("errands").select("*").eq("customer_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setErrands(data || []); setLoading(false); });
  }, [user]);

  if (loading) {
    return <AppLayout type="customer"><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout type="customer">
      <div className="space-y-5">
        <h1 className="text-xl font-display font-bold text-foreground">My Errands</h1>
        {errands.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No errands yet.</p>
            <Link to="/customer/post-errand" className="text-sm text-primary font-medium mt-2 inline-block">Post your first errand</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {errands.map((e) => (
              <Link key={e.id} to={`/customer/errand/${e.id}`} className="block p-4 rounded-2xl bg-card border border-border shadow-premium hover:border-primary/20 transition-colors">
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
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CustomerErrands;
