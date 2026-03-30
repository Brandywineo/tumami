import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, User, Phone, MapPin, IdCard, Shield, Calendar, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface RunnerApp {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  national_id: string | null;
  town: string | null;
  transport: string | null;
  emergency_contact: string | null;
  availability: string | null;
  bio: string | null;
  username: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  id_document_url: string | null;
  id_back_url: string | null;
  selfie_url: string | null;
  profile_photo_url: string | null;
}

const RunnerApplicationReview = () => {
  const [runners, setRunners] = useState<RunnerApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("under_review");
  const [profileEmails, setProfileEmails] = useState<Record<string, string>>({});

  const fetchRunners = async () => {
    setLoading(true);
    const query = supabase.from("runner_verifications").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") query.eq("status", statusFilter as any);
    const { data } = await query.limit(50);
    const items = (data || []) as RunnerApp[];
    setRunners(items);

    // Fetch profile emails
    if (items.length > 0) {
      const userIds = items.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, email").in("user_id", userIds);
      const map: Record<string, string> = {};
      (profiles || []).forEach(p => { map[p.user_id] = p.email; });
      setProfileEmails(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRunners(); }, [statusFilter]);

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

  const statusColors: Record<string, string> = {
    under_review: "bg-accent/10 text-accent",
    verified: "bg-emerald-light text-primary",
    rejected: "bg-destructive/10 text-destructive",
    not_submitted: "bg-muted text-muted-foreground",
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {["under_review", "verified", "rejected", "all"].map(s => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="rounded-xl text-xs capitalize" onClick={() => setStatusFilter(s)}>
            {s === "under_review" ? "Pending" : s === "all" ? "All" : s}
          </Button>
        ))}
      </div>

      {runners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No applications found</p>
        </div>
      ) : (
        runners.map(r => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-border shadow-premium">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {r.selfie_url ? (
                      <button onClick={() => setImagePreview(r.selfie_url)} className="w-12 h-12 rounded-xl overflow-hidden border border-border flex-shrink-0">
                        <img src={r.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground text-sm">{r.full_name}</p>
                      {r.username && <p className="text-xs text-primary">@{r.username}</p>}
                      <p className="text-[10px] text-muted-foreground">{profileEmails[r.user_id] || ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${statusColors[r.status] || "bg-muted text-muted-foreground"}`}>
                      {r.status === "under_review" ? "Pending" : r.status}
                    </Badge>
                    <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                      {expandedId === r.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {/* Quick info */}
                <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.town || "—"}</span>
                  <span className="flex items-center gap-1"><IdCard className="w-3 h-3" /> {r.national_id || "—"}</span>
                </div>

                {/* Expanded details */}
                {expandedId === r.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-3 pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <InfoRow label="Transport" value={r.transport} />
                      <InfoRow label="Availability" value={r.availability} />
                      <InfoRow label="Emergency" value={r.emergency_contact} />
                      <InfoRow label="Applied" value={r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : new Date(r.created_at).toLocaleDateString()} />
                      {r.reviewed_at && <InfoRow label="Reviewed" value={new Date(r.reviewed_at).toLocaleDateString()} />}
                    </div>

                    {r.bio && (
                      <div className="p-2 rounded-xl bg-muted/50">
                        <p className="text-[10px] text-muted-foreground mb-1">Bio</p>
                        <p className="text-xs text-foreground italic">"{r.bio}"</p>
                      </div>
                    )}

                    {r.rejection_reason && (
                      <div className="p-2 rounded-xl bg-destructive/5 border border-destructive/20">
                        <p className="text-[10px] text-destructive font-medium mb-1">Previous Rejection</p>
                        <p className="text-xs text-muted-foreground">{r.rejection_reason}</p>
                      </div>
                    )}

                    {/* Document previews */}
                    <div>
                      <p className="text-xs font-medium text-foreground mb-2">Documents</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "ID Front", url: r.id_document_url },
                          { label: "ID Back", url: r.id_back_url },
                          { label: "Selfie", url: r.selfie_url },
                          { label: "Good Conduct", url: r.profile_photo_url },
                        ].map(doc => (
                          <button
                            key={doc.label}
                            onClick={() => doc.url && setImagePreview(doc.url)}
                            className="aspect-square rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center hover:border-primary/30 transition-colors"
                          >
                            {doc.url ? (
                              <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] text-muted-foreground text-center px-1">{doc.label}<br />N/A</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                {r.status === "under_review" && (
                  <>
                    {rejectingId === r.user_id ? (
                      <div className="space-y-2">
                        <Textarea placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="rounded-xl text-sm min-h-[60px]" />
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
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}

      {/* Image preview dialog */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-lg p-2">
          <DialogHeader><DialogTitle className="text-sm">Document Preview</DialogTitle></DialogHeader>
          {imagePreview && <img src={imagePreview} alt="Document" className="w-full rounded-xl" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-xs font-medium text-foreground capitalize">{value || "—"}</p>
  </div>
);

export default RunnerApplicationReview;
