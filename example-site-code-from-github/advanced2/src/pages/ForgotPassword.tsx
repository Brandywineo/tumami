import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Please enter your email."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
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
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Reset Your Password</h1>
          <p className="text-muted-foreground text-sm">Enter your email and we'll send you a reset link</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
            <p className="text-muted-foreground text-sm">
              We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
            </p>
            <Link to="/login">
              <Button variant="outline" className="mt-4 gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl" />
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
