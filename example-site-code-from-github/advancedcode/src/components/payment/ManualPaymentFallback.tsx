import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ManualPaymentFallbackProps {
  amount: number;
  purpose: "wallet_topup" | "errand_payment";
  errandId?: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

const TILL_NUMBER = "3405451";
const BUSINESS_NAME = "TUMAMI NETWORKS";

const ManualPaymentFallback = ({ amount, purpose, errandId, onSuccess, onBack }: ManualPaymentFallbackProps) => {
  const { user } = useAuth();
  const [mpesaCode, setMpesaCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyTill = async () => {
    await navigator.clipboard.writeText(TILL_NUMBER);
    setCopied(true);
    toast.success("Till number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!user || !mpesaCode.trim()) return;
    const code = mpesaCode.trim().toUpperCase();
    if (code.length < 8) {
      toast.error("Please enter a valid M-Pesa confirmation code");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("manual_payments" as any).insert({
        user_id: user.id,
        amount,
        mpesa_code: code,
        purpose,
        errand_id: errandId || null,
      } as any);
      if (error) {
        if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
          toast.error("This M-Pesa code has already been submitted");
        } else throw error;
        return;
      }
      setSubmitted(true);
      toast.success("Payment submitted for verification!");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-light flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-lg font-display font-bold text-foreground">Payment Submitted for Verification</h2>
        <p className="text-sm text-muted-foreground">Your manual M-Pesa payment has been submitted. An admin will verify it shortly.</p>
        {onBack && (
          <Button className="w-full h-12 rounded-xl font-semibold" onClick={onBack}>Done</Button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mx-auto space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-lg font-display font-bold text-foreground">Complete Payment Manually</h2>
        <p className="text-sm text-muted-foreground mt-1">Your STK push did not go through. Complete the payment manually using the till number below.</p>
      </div>

      {/* Amount */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-premium text-center">
        <p className="text-3xl font-bold text-primary">KES {amount.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {purpose === "wallet_topup" ? "Wallet Top Up" : "Errand Payment"}
        </p>
      </div>

      {/* Till Details */}
      <div className="p-4 rounded-2xl bg-emerald-light/30 border border-primary/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Till Number</p>
            <p className="text-2xl font-bold text-primary tracking-wider">{TILL_NUMBER}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={copyTill}>
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Business Name</p>
          <p className="text-sm font-semibold text-foreground">{BUSINESS_NAME}</p>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
        <p className="text-sm font-semibold text-foreground mb-2">Steps:</p>
        {[
          "Open M-Pesa on your phone",
          "Select Lipa na M-Pesa",
          "Select Buy Goods and Services",
          `Enter Till Number ${TILL_NUMBER}`,
          `Enter the exact amount KES ${amount.toLocaleString()}`,
          `Confirm business name is ${BUSINESS_NAME}`,
          "Complete the payment",
          "Copy the M-Pesa confirmation code",
          "Paste the code below and submit",
        ].map((s, i) => (
          <div key={i} className="flex gap-2 text-xs text-muted-foreground">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0 text-[10px]">{i + 1}</span>
            <span className="pt-0.5">{s}</span>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="p-2.5 rounded-lg bg-accent/5 border border-accent/10">
        <p className="text-xs text-accent font-medium">⚠ Enter the exact amount (KES {amount.toLocaleString()}) for faster verification.</p>
      </div>

      {/* Code Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">M-Pesa Confirmation Code</Label>
        <Input
          placeholder="e.g. SJ12ABC456"
          value={mpesaCode}
          onChange={e => setMpesaCode(e.target.value.toUpperCase())}
          className="h-12 rounded-xl text-center text-lg font-mono tracking-wider uppercase"
        />
      </div>

      <Button className="w-full h-12 rounded-xl font-semibold" onClick={handleSubmit} disabled={!mpesaCode.trim() || submitting}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "I Have Paid"}
      </Button>

      {onBack && (
        <button onClick={onBack} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
          ← Go Back
        </button>
      )}
    </motion.div>
  );
};

export default ManualPaymentFallback;
