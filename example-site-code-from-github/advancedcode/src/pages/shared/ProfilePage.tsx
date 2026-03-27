import { useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, MapPin, LogOut, Shield, HelpCircle, Loader2, ArrowRight, Save, Navigation } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ProfilePage = ({ type = "customer" }: { type?: "customer" | "runner" }) => {
  const { user, profile, roles, signOut, loading, selectRole, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    town: profile?.town || "",
    landmark: (profile as any)?.landmark || "",
  });

  const handleUseLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          const town = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "";
          const landmark = data.address?.suburb || data.address?.neighbourhood || data.address?.road || "";
          setForm(prev => ({ ...prev, town: town || prev.town, landmark: landmark || prev.landmark }));
        } catch { /* silent */ }
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: form.full_name,
        phone: form.phone,
        town: form.town,
        landmark: form.landmark,
      } as any).eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated!");
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchRole = async () => {
    const newRole = type === "customer" ? "runner" : "customer";
    await selectRole(newRole as "customer" | "runner");
    if (newRole === "runner") {
      // Check verification status before allowing runner access
      const { data } = await supabase.from("runner_verifications").select("status").eq("user_id", user!.id).single();
      const status = data?.status;
      if (!status || status === "not_submitted" || status === "rejected") {
        navigate("/runner/verification");
      } else if (status === "under_review") {
        navigate("/runner/pending");
      } else {
        navigate("/runner");
      }
    } else {
      navigate("/customer");
    }
    toast.success(`Switched to ${newRole} mode`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return <AppLayout type={type}><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout type={type}>
      <div className="space-y-6">
        {/* Avatar & Name */}
        <div className="text-center pt-4">
          <div className="w-20 h-20 rounded-full bg-gradient-emerald flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-display font-bold text-primary-foreground">{(profile?.full_name || "U").charAt(0)}</span>
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">{profile?.full_name || "User"}</h1>
          <p className="text-sm text-muted-foreground capitalize">{type}</p>
          {roles.includes("runner") && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary bg-emerald-light px-3 py-1 rounded-full">
              <Shield className="w-3 h-3" /> Verified Runner
            </span>
          )}
        </div>

        {/* Personal Information */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
            {!editing && (
              <button onClick={() => { setEditing(true); setForm({ full_name: profile?.full_name || "", phone: profile?.phone || "", town: profile?.town || "", landmark: (profile as any)?.landmark || "" }); }} className="text-xs text-primary font-medium">Edit</button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label className="text-xs">Full Name</Label>
                <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Town / Area</Label>
                  <button type="button" onClick={handleUseLocation} disabled={locating} className="text-xs text-primary font-medium flex items-center gap-1 disabled:opacity-50">
                    {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                    {locating ? "Locating..." : "Use My Location"}
                  </button>
                </div>
                <Input value={form.town} onChange={e => setForm(p => ({ ...p, town: e.target.value }))} placeholder="e.g. Westlands, Nairobi" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Landmark <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input value={form.landmark} onChange={e => setForm(p => ({ ...p, landmark: e.target.value }))} placeholder="e.g. Near Sarit Centre" className="h-11 rounded-xl" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setEditing(false)}>Cancel</Button>
                <Button className="flex-1 h-11 rounded-xl font-semibold gap-2" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <ProfileRow icon={User} label="Full Name" value={profile?.full_name || "—"} />
              <ProfileRow icon={Mail} label="Email" value={profile?.email || "—"} />
              <ProfileRow icon={Phone} label="Phone" value={profile?.phone || "—"} />
              <ProfileRow icon={MapPin} label="Town / Area" value={profile?.town || "—"} />
              <ProfileRow icon={MapPin} label="Landmark" value={(profile as any)?.landmark || "—"} />
            </div>
          )}
        </div>

        {/* Switch Role */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-premium">
          <h3 className="text-sm font-semibold text-foreground mb-1">Switch Role</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Currently using Tumame as a <span className="font-medium capitalize text-foreground">{type}</span>
          </p>
          <Button variant="outline" className="w-full h-12 rounded-xl font-semibold gap-2 border-2" onClick={handleSwitchRole}>
            {type === "customer" ? (
              <><Shield className="w-4 h-4 text-primary" /> Become a Runner</>
            ) : (
              <><User className="w-4 h-4 text-primary" /> Switch to Customer</>
            )}
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {type === "runner" && (
            <Button variant="outline" className="w-full h-12 rounded-xl justify-start gap-3 font-medium" onClick={() => navigate("/runner/verification")}>
              <Shield className="w-4 h-4 text-primary" /> Verification Status
            </Button>
          )}
          <Button variant="outline" className="w-full h-12 rounded-xl justify-start gap-3 font-medium">
            <HelpCircle className="w-4 h-4 text-muted-foreground" /> Support
          </Button>
          <Button variant="outline" className="w-full h-12 rounded-xl justify-start gap-3 font-medium text-destructive border-destructive/20 hover:bg-destructive/5" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

const ProfileRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border shadow-premium">
    <div className="w-10 h-10 rounded-xl bg-emerald-light flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  </div>
);

export default ProfilePage;
