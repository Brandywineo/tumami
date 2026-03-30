import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Star, MessageCircle, Trash2, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";

const PreferredRunners = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [runners, setRunners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("preferred_runners")
      .select("*").eq("client_id", user.id).order("created_at", { ascending: false });
    
    if (data) {
      const enriched = await Promise.all(data.map(async (pref) => {
        const { data: profileData } = await supabase.rpc("get_runner_profile", { p_runner_id: pref.runner_id });
        return { ...pref, profile: profileData };
      }));
      setRunners(enriched.filter(r => r.profile && !(r.profile as any).error));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (runnerId: string) => {
    if (!user) return;
    await supabase.from("preferred_runners").delete().eq("client_id", user.id).eq("runner_id", runnerId);
    setRunners(prev => prev.filter(r => r.runner_id !== runnerId));
    toast.success("Removed from preferred runners");
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;
  if (runners.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3">Preferred Runners</h2>
      <div className="space-y-3">
        {runners.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="p-4 rounded-2xl bg-card border border-border shadow-premium">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(`/runner-profile/${r.runner_id}`)} className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {r.profile.avatar_url ? (
                  <img src={r.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
              </button>
              <div className="flex-1 min-w-0" onClick={() => navigate(`/runner-profile/${r.runner_id}`)}>
                <p className="text-sm font-semibold text-foreground truncate">{r.profile.full_name}</p>
                <div className="flex items-center gap-2">
                  {r.profile.username && <span className="text-xs text-muted-foreground">@{r.profile.username}</span>}
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-xs text-foreground font-medium">{r.profile.avg_rating}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => navigate(`/customer/messages?with=${r.runner_id}`)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button onClick={() => remove(r.runner_id)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PreferredRunners;
