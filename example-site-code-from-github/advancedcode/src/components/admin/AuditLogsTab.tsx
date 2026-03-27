import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText } from "lucide-react";

const AuditLogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-3 mt-4">
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No audit logs yet</p>
        </div>
      ) : (
        logs.map((log) => (
          <Card key={log.id} className="rounded-2xl border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground text-sm capitalize">{log.action.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{log.target_type} · {log.target_id?.slice(0, 8)}...</p>
                </div>
                <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
              </div>
              {log.details?.reason && <p className="text-xs text-muted-foreground mt-1 italic">Reason: {log.details.reason}</p>}
              {log.details?.amount && <p className="text-xs text-muted-foreground mt-1">Amount: KES {log.details.amount}</p>}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default AuditLogsTab;
