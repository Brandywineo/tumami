import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, MailX, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid === true) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setState("success");
      else if (data?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    } finally { setProcessing(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        {state === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">Validating...</p>
          </>
        )}
        {state === "valid" && (
          <>
            <MailX className="w-12 h-12 text-accent mx-auto" />
            <h1 className="text-xl font-display font-bold text-foreground">Unsubscribe from Tumame Emails</h1>
            <p className="text-sm text-muted-foreground">You'll stop receiving app notification emails. Important account emails may still be sent.</p>
            <Button className="w-full h-12 rounded-xl font-semibold" onClick={handleUnsubscribe} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Unsubscribe"}
            </Button>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-xl font-display font-bold text-foreground">Unsubscribed</h1>
            <p className="text-sm text-muted-foreground">You've been successfully unsubscribed from Tumame notification emails.</p>
          </>
        )}
        {state === "already" && (
          <>
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-display font-bold text-foreground">Already Unsubscribed</h1>
            <p className="text-sm text-muted-foreground">You're already unsubscribed from Tumame notification emails.</p>
          </>
        )}
        {state === "invalid" && (
          <>
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-xl font-display font-bold text-foreground">Invalid Link</h1>
            <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or has expired.</p>
          </>
        )}
        {state === "error" && (
          <>
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-xl font-display font-bold text-foreground">Something Went Wrong</h1>
            <p className="text-sm text-muted-foreground">Please try again later.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
