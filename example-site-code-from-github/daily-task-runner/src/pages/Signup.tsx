import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const Signup = () => {
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validatePhone = (p: string) => /^(?:0|\+254|254)[17]\d{8}$/.test(p.replace(/\s/g, ""));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.phone || !form.email || !form.password) { setError("All fields are required."); return; }
    if (!validatePhone(form.phone)) { setError("Enter a valid Kenyan phone number (e.g. 0712 345 678)."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); window.location.href = "/role-select"; }, 1500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        <div className="mb-10 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <span className="font-display text-lg font-bold text-primary-foreground">T</span>
          </div>
          <span className="font-display text-2xl font-bold text-foreground">Tumame</span>
        </div>

        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="animate-fade-in space-y-5">
            <div className="text-center">
              <h1 className="font-display text-xl font-bold text-foreground">Create your account</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Join Tumame and get errands done</p>
            </div>

            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="e.g. James Mwangi" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="0712 345 678" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="At least 6 characters" value={form.password} onChange={(e) => update("password", e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Create account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
