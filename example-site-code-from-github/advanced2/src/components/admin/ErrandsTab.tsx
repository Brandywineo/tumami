import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Flag, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Errand = {
  id: string;
  title: string;
  service_type: string;
  status: string;
  total_amount: number;
  errand_payment_status: string | null;
  created_at: string;
  customer_id: string;
  runner_id: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  description: string | null;
  notes: string | null;
};

const statusColor: Record<string, string> = {
  pending_payment: "bg-muted text-muted-foreground",
  paid: "bg-primary/10 text-primary",
  open: "bg-accent/10 text-accent",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  awaiting_confirmation: "bg-purple-100 text-purple-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-destructive/10 text-destructive",
};

const ErrandsTab = () => {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Errand | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("errands")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setErrands((data as Errand[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from("errands")
      .update({ status: "cancelled" as any, notes: "[ADMIN CANCELLED]" })
      .eq("id", id);
    if (error) { toast.error("Failed to cancel errand"); return; }
    toast.success("Errand cancelled");
    load();
  };

  const handleFlag = async (id: string) => {
    const { error } = await supabase
      .from("errands")
      .update({ notes: "[FLAGGED BY ADMIN]" } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to flag errand"); return; }
    toast.success("Errand flagged");
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3 mt-4">
      <p className="text-sm text-muted-foreground">{errands.length} errands found</p>
      {errands.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No errands yet.</p>}
      {errands.map((e) => (
        <div key={e.id} className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{e.title}</p>
              <p className="text-xs text-muted-foreground">{e.service_type} · {format(new Date(e.created_at), "dd MMM yyyy")}</p>
            </div>
            <Badge className={`text-[10px] shrink-0 ${statusColor[e.status] || "bg-muted text-muted-foreground"}`}>{e.status.replace(/_/g, " ")}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">KES {e.total_amount.toLocaleString()}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelected(e)}><Eye className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-600" onClick={() => handleFlag(e.id)}><Flag className="w-3.5 h-3.5" /></Button>
              {e.status !== "cancelled" && e.status !== "completed" && (
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleCancel(e.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              )}
            </div>
          </div>
          {e.notes && e.notes.includes("[FLAGGED") && (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">Flagged</Badge>
          )}
        </div>
      ))}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">Errand Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Title:</span> {selected.title}</p>
              <p><span className="text-muted-foreground">Type:</span> {selected.service_type}</p>
              <p><span className="text-muted-foreground">Status:</span> {selected.status.replace(/_/g, " ")}</p>
              <p><span className="text-muted-foreground">Amount:</span> KES {selected.total_amount.toLocaleString()}</p>
              <p><span className="text-muted-foreground">Payment:</span> {selected.errand_payment_status || "—"}</p>
              <p><span className="text-muted-foreground">Pickup:</span> {selected.pickup_location || "—"}</p>
              <p><span className="text-muted-foreground">Dropoff:</span> {selected.dropoff_location || "—"}</p>
              <p><span className="text-muted-foreground">Description:</span> {selected.description || "—"}</p>
              <p><span className="text-muted-foreground">Notes:</span> {selected.notes || "—"}</p>
              <p><span className="text-muted-foreground">Customer:</span> <span className="font-mono text-[10px]">{selected.customer_id}</span></p>
              <p><span className="text-muted-foreground">Runner:</span> <span className="font-mono text-[10px]">{selected.runner_id || "Unassigned"}</span></p>
              <p><span className="text-muted-foreground">Created:</span> {format(new Date(selected.created_at), "dd MMM yyyy, HH:mm")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ErrandsTab;
