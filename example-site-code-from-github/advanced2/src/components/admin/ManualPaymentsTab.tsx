import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const ManualPaymentsTab = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [actionId, setActionId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("manual_payments").select("*").order("created_at", { ascending: false }).limit(100);
    const items = (data || []) as any[];
    setPayments(items);

    const uids = [...new Set(items.map((p: any) => p.user_id))];
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, phone, email").in("user_id", uids);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }

    // Check for duplicate mpesa codes
    const codes = items.map((p: any) => p.mpesa_code);
    const dupes = codes.filter((c: string, i: number) => codes.indexOf(c) !== i);
    if (dupes.length) {
      toast.warning(`Possible duplicate M-Pesa codes: ${[...new Set(dupes)].join(", ")}`);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();

    // Realtime subscription
    const channel = supabase
      .channel("admin-manual-payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "manual_payments" }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    if (!user) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-action", {
        body: {
          action: action === "approved" ? "approve_manual_payment" : "reject_manual_payment",
          target_id: id,
          reason: adminNote || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Payment ${action}`);
      setActionId("");
      setAdminNote("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  if (!payments.length) return (
    <div className="p-8 rounded-2xl bg-card border border-border text-center">
      <p className="text-sm text-muted-foreground">No manual payments submitted yet.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {payments.map(p => {
        const prof = profiles[p.user_id];
        const isPending = p.status === "pending";
        const isExpanded = actionId === p.id;

        return (
          <div key={p.id} className="p-4 rounded-2xl bg-card border border-border shadow-premium space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{prof?.full_name || "Unknown User"}</p>
                <p className="text-xs text-muted-foreground">{prof?.phone || "—"} · {prof?.email || ""}</p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                p.status === "approved" ? "bg-emerald-light text-primary" :
                p.status === "rejected" ? "bg-destructive/10 text-destructive" :
                "bg-accent/10 text-accent"
              }`}>{p.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Amount:</span> <span className="font-semibold text-foreground">KES {Number(p.amount).toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Purpose:</span> <span className="font-medium text-foreground capitalize">{p.purpose?.replace("_", " ")}</span></div>
              <div><span className="text-muted-foreground">M-Pesa Code:</span> <span className="font-mono font-semibold text-primary">{p.mpesa_code}</span></div>
              <div><span className="text-muted-foreground">Date:</span> <span className="text-foreground">{new Date(p.created_at).toLocaleString()}</span></div>
            </div>

            {p.admin_note && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">Admin: {p.admin_note}</p>
            )}

            {isPending && (
              <>
                {isExpanded ? (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Textarea
                      placeholder="Admin note (optional)"
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      className="rounded-xl min-h-[60px] text-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 rounded-xl gap-1" onClick={() => handleAction(p.id, "approved")} disabled={processing}>
                        {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1 rounded-xl gap-1" onClick={() => handleAction(p.id, "rejected")} disabled={processing}>
                        {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Reject
                      </Button>
                    </div>
                    <button onClick={() => { setActionId(""); setAdminNote(""); }} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">Cancel</button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="w-full rounded-xl text-xs" onClick={() => setActionId(p.id)}>
                    Review Payment
                  </Button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ManualPaymentsTab;
