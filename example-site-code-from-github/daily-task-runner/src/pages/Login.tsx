import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      window.location.href = "/role-select";
    }, 1500);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Enter your email address."); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setForgotSent(true); }, 1200);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <span className="font-display text-lg font-bold text-primary-foreground">T</span>
          </div>
          <span className="font-display text-2xl font-bold text-foreground">Tumame</span>
        </div>

        <div className="w-full max-w-sm">
          {forgotMode ? (
            forgotSent ? (
              <div className="animate-fade-in text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-subtle">
                  <span className="text-2xl">✉️</span>
                </div>
                <h1 className="font-display text-xl font-bold text-foreground">Check your email</h1>
                <p className="mt-2 text-sm text-muted-foreground">We've sent a password reset link to <span className="font-medium text-foreground">{email}</span></p>
                <Button variant="ghost" className="mt-6" onClick={() => { setForgotMode(false); setForgotSent(false); }}>
                  Back to login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="animate-fade-in space-y-5">
                <div className="text-center">
                  <h1 className="font-display text-xl font-bold text-foreground">Forgot password?</h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">Enter your email and we'll send a reset link.</p>
                </div>
                {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" size={18} /> : "Send reset link"}
                </Button>
                <button type="button" onClick={() => { setForgotMode(false); setError(""); }} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
                  Back to login
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="animate-fade-in space-y-5">
              <div className="text-center">
                <h1 className="font-display text-xl font-bold text-foreground">Welcome back</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your Tumame account</p>
              </div>

              {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={() => { setForgotMode(true); setError(""); }} className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Sign in"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
