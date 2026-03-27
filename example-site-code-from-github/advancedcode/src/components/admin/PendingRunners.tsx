import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const PendingRunners = () => {
  const [runners, setRunners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchRunners = async () => {
    const { data } = await supabase
      .from("runner_verifications")
      .select("*")
      .eq("status", "under_review")
      .order("created_at", { ascending: false });
    setRunners(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRunners(); }, []);

  const doAction = async (action: string, userId: string, reason?: string) => {
    setActing(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-action", {
        body: { action, target_id: userId, reason },
      });
      if (error) throw error;
      toast.success(data.message);
      setRejectingId(null);
      setRejectReason("");
      await fetchRunners();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-3 mt-4">
      {runners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No pending runner applications</p>
        </div>
      ) : (
        runners.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-border shadow-premium">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.phone} · {r.town}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{r.transport}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>ID: {r.national_id || "—"}</span>
                  <span>Emergency: {r.emergency_contact || "—"}</span>
                  <span>Availability: {r.availability || "—"}</span>
                </div>
                {r.bio && <p className="text-xs text-muted-foreground italic">"{r.bio}"</p>}

                {rejectingId === r.user_id ? (
                  <div className="space-y-2">
                    <Input placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="h-10 rounded-xl text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" className="flex-1 rounded-xl" disabled={acting === r.user_id} onClick={() => doAction("reject_runner", r.user_id, rejectReason)}>Confirm Reject</Button>
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setRejectingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 rounded-xl gap-1" disabled={acting === r.user_id} onClick={() => doAction("approve_runner", r.user_id)}>
                      {acting === r.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 rounded-xl gap-1" onClick={() => setRejectingId(r.user_id)}>
                      <XCircle className="w-3 h-3" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default PendingRunners;
