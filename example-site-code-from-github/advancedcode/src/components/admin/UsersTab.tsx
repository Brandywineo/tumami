import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";

const UsersTab = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
      ]);
      setProfiles(p.data || []);
      setUserRoles(r.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const getRoles = (userId: string) =>
    userRoles.filter((r) => r.user_id === userId).map((r) => r.role);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-3 mt-4">
      {profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No users found</p>
        </div>
      ) : (
        profiles.map((p) => (
          <Card key={p.id} className="rounded-2xl border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{p.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                  <p className="text-xs text-muted-foreground">{p.phone} · {p.town || "—"}</p>
                  <p className="text-xs text-muted-foreground">Balance: KES {Number(p.wallet_balance || 0).toLocaleString()}</p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {getRoles(p.user_id).map((role: string) => (
                    <Badge key={role} variant={role === "admin" ? "default" : "secondary"} className="text-[10px] capitalize">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Joined {new Date(p.created_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default UsersTab;
