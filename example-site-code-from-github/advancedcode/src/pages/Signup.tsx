import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Signup = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", confirm: "", town: "", landmark: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));
  const validatePhone = (phone: string) => /^(?:\+254|0)\d{9}$/.test(phone.replace(/\s/g, ""));

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.phone || !form.email || !form.password || !form.confirm) {
      setError("Please fill in all fields."); return;
    }
    if (!validatePhone(form.phone)) { setError("Enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678)."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.name, form.phone, form.town, form.landmark);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate("/role-select");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-emerald flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold">T</span>
            </div>
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Create Account</h1>
          <p className="text-muted-foreground text-sm">Join Tumame and get things done</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}

          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input placeholder="John Kamau" value={form.name} onChange={e => update("name", e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input placeholder="0712345678" value={form.phone} onChange={e => update("phone", e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="you@example.com" value={form.email} onChange={e => update("email", e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Town / Area</Label>
              <button type="button" onClick={handleUseLocation} disabled={locating} className="text-xs text-primary font-medium flex items-center gap-1 disabled:opacity-50">
                {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                {locating ? "Locating..." : "Use My Location"}
              </button>
            </div>
            <Input placeholder="e.g. Westlands, Nairobi" value={form.town} onChange={e => update("town", e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Landmark <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="e.g. Near Sarit Centre" value={form.landmark} onChange={e => update("landmark", e.target.value)} className="h-12 rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={e => update("password", e.target.value)} className="h-12 rounded-xl pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <Input type="password" placeholder="••••••••" value={form.confirm} onChange={e => update("confirm", e.target.value)} className="h-12 rounded-xl" />
          </div>

          <Button type="submit" className="w-full h-12 rounded-xl font-semibold gap-2" disabled={loading}>
            {loading ? "Creating account..." : <>Create Account <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
