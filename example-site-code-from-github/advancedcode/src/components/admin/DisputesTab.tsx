import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, Eye, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const statusColor: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const DisputesTab = () => {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const fetchDisputes = async () => {
    const { data } = await supabase
      .from("disputes")
      .select("*")
      .order("created_at", { ascending: false });
    setDisputes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDisputes(); }, []);

  const doAction = async (action: string, id: string, reason?: string) => {
    setActing(id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-action", {
        body: { action, target_id: id, reason },
      });
      if (error) throw error;
      toast.success(data.message);
      setResolvingId(null);
      setResolutionNote("");
      await fetchDisputes();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-3 mt-4">
      {disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No disputes</p>
        </div>
      ) : (
        disputes.map((d) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-border shadow-premium">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm capitalize">{d.dispute_type} Dispute</p>
                    <p className="text-xs text-muted-foreground">Errand: {d.errand_id?.slice(0, 8)}...</p>
                  </div>
                  <Badge className={`text-[10px] capitalize ${statusColor[d.status] || ""}`}>{d.status.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{d.reason}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleString()}</p>
                {d.resolution_note && <p className="text-xs text-muted-foreground italic">Resolution: {d.resolution_note}</p>}

                {(d.status === "open" || d.status === "under_review") && (
                  <>
                    {resolvingId === d.id ? (
                      <div className="space-y-2">
                        <Input placeholder="Resolution note..." value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} className="h-10 rounded-xl text-sm" />
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 rounded-xl gap-1" disabled={acting === d.id} onClick={() => doAction("resolve_dispute", d.id, resolutionNote)}>
                            <CheckCircle className="w-3 h-3" /> Resolve
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1 rounded-xl gap-1" disabled={acting === d.id} onClick={() => doAction("reject_dispute", d.id, resolutionNote)}>
                            <XCircle className="w-3 h-3" /> Reject
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setResolvingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {d.status === "open" && (
                          <Button size="sm" variant="secondary" className="flex-1 rounded-xl gap-1" disabled={acting === d.id} onClick={() => doAction("review_dispute", d.id)}>
                            <Eye className="w-3 h-3" /> Mark Under Review
                          </Button>
                        )}
                        <Button size="sm" className="flex-1 rounded-xl gap-1" onClick={() => setResolvingId(d.id)}>
                          Resolve / Reject
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default DisputesTab;
