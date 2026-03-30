import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const WithdrawalsTab = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchData = async () => {
    const [oldRes, newRes] = await Promise.all([
      supabase.from("withdrawal_requests").select("*").in("status", ["pending"]).order("created_at", { ascending: false }),
      supabase.from("runner_withdrawals").select("*").in("status", ["pending"]).order("requested_at", { ascending: false }),
    ]);
    const combined = [
      ...(oldRes.data || []).map((w: any) => ({ ...w, source: "legacy" })),
      ...(newRes.data || []).map((w: any) => ({ ...w, created_at: w.requested_at, source: "new" })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRequests(combined);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const doAction = async (action: string, id: string, reason?: string) => {
    setActing(id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-action", {
        body: { action, target_id: id, reason },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message);
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-3 mt-4">
      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <Wallet className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No pending withdrawal requests</p>
        </div>
      ) : (
        requests.map((w) => (
          <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-border shadow-premium">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">KES {Number(w.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{w.phone || w.payout_method || "M-Pesa"}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] capitalize">{w.status}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Approving will deduct wallet and mark as successful.</p>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 rounded-xl gap-1" disabled={acting === w.id} onClick={() => doAction("approve_withdrawal", w.id)}>
                    <CheckCircle className="w-3 h-3" /> Approve & Process
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1 rounded-xl gap-1" disabled={acting === w.id} onClick={() => doAction("reject_withdrawal", w.id, "Rejected by admin")}>
                    <XCircle className="w-3 h-3" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default WithdrawalsTab;
