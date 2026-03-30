import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    const { error } = await signIn(email, password);
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
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-sm">Sign in to your Tumame account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-xl pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 rounded-xl font-semibold gap-2" disabled={loading}>
            {loading ? "Signing in..." : <>Sign In <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account? <Link to="/signup" className="text-primary font-semibold hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
