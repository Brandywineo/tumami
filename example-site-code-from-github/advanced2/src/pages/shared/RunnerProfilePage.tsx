import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, MessageCircle, Heart, Shield, MapPin, Clock, Package, Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import RatingDialog from "@/components/runner/RatingDialog";

const RunnerProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPreferred, setIsPreferred] = useState(false);
  const [togglingPref, setTogglingPref] = useState(false);
  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_runner_profile", { p_runner_id: id });
      if (error || (data as any)?.error) {
        setLoading(false); return;
      }
      setProfile(data);

      if (user) {
        const { data: pref } = await supabase.from("preferred_runners")
          .select("id").eq("client_id", user.id).eq("runner_id", id).maybeSingle();
        setIsPreferred(!!pref);
      }

      const { data: r } = await supabase.from("runner_ratings")
        .select("*").eq("runner_id", id).order("created_at", { ascending: false }).limit(10);
      setRatings(r || []);
      setLoading(false);
    };
    load();
  }, [id, user]);

  const togglePreferred = async () => {
    if (!user || !id) return;
    setTogglingPref(true);
    try {
      if (isPreferred) {
        await supabase.from("preferred_runners").delete().eq("client_id", user.id).eq("runner_id", id);
        setIsPreferred(false);
        toast.success("Removed from preferred runners");
      } else {
        const { error } = await supabase.from("preferred_runners").insert({ client_id: user.id, runner_id: id });
        if (error) throw error;
        setIsPreferred(true);
        toast.success("Added to preferred runners!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally { setTogglingPref(false); }
  };

  if (loading) {
    return <AppLayout type="customer"><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div></AppLayout>;
  }

  if (!profile || profile.error) {
    return <AppLayout type="customer"><div className="p-8 text-center text-muted-foreground">Runner not found or not verified.</div></AppLayout>;
  }

  return (
    <AppLayout type="customer">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-display font-bold text-foreground">Runner Profile</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-card border border-border shadow-premium text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{profile.full_name?.[0] || "R"}</span>
            )}
          </div>
          <h2 className="text-lg font-bold text-foreground">{profile.full_name}</h2>
          {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}

          <div className="flex items-center justify-center gap-1 mt-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Verified Runner</span>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <Star className="w-4 h-4 text-accent fill-accent" />
                <span className="font-bold text-foreground">{profile.avg_rating}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{profile.total_ratings} reviews</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="font-bold text-foreground">{profile.completed_errands}</p>
              <p className="text-[10px] text-muted-foreground">Errands</p>
            </div>
          </div>
        </motion.div>

        {profile.bio && (
          <div className="p-4 rounded-2xl bg-card border border-border">
            <p className="text-sm text-foreground">{profile.bio}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {profile.town && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-foreground capitalize">{profile.town}</span>
            </div>
          )}
          {profile.transport && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-foreground capitalize">{profile.transport}</span>
            </div>
          )}
          {profile.availability && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-foreground capitalize">{profile.availability?.replace("_", " ")}</span>
            </div>
          )}
          {profile.joined_at && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-foreground">Joined {new Date(profile.joined_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button className="h-12 rounded-xl font-semibold gap-2" onClick={() => navigate(`/customer/messages?with=${profile.user_id}`)}>
            <MessageCircle className="w-4 h-4" /> Message Runner
          </Button>
          <Button variant="outline" className="h-12 rounded-xl font-semibold gap-2 border-2" onClick={togglePreferred} disabled={togglingPref}>
            {togglingPref ? <Loader2 className="w-4 h-4 animate-spin" /> : isPreferred ? <Heart className="w-4 h-4 fill-destructive text-destructive" /> : <UserPlus className="w-4 h-4" />}
            {isPreferred ? "Remove from Preferred" : "Add to Preferred"}
          </Button>
        </div>

        {ratings.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent Reviews</h3>
            <div className="space-y-3">
              {ratings.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl bg-card border border-border">
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-accent fill-accent" : "text-muted"}`} />
                    ))}
                  </div>
                  {r.review && <p className="text-sm text-muted-foreground">{r.review}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default RunnerProfilePage;
