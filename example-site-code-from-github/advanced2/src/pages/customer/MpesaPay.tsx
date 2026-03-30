import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, CheckCircle, XCircle, Loader2, Ban, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ManualPaymentFallback from "@/components/payment/ManualPaymentFallback";

type PayState = "input" | "pending" | "success" | "failed" | "cancelled" | "timeout" | "manual";

const MpesaPay = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { amount = 0, title = "Wallet Top Up", errandId, purpose: passedPurpose } = (location.state as any) || {};
  const purpose: "wallet_topup" | "errand_payment" = errandId ? "errand_payment" : (passedPurpose || "wallet_topup");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<PayState>("input");
  const [attemptId, setAttemptId] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [polling, setPolling] = useState(false);

  // Poll for payment status
  const pollStatus = useCallback(async (id: string) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 40; // ~2 minutes
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data } = await supabase
          .from("mpesa_payment_attempts")
          .select("status, mpesa_receipt_number")
          .eq("id", id)
          .single();

        if (data) {
          if (data.status === "success") {
            clearInterval(interval);
            setPolling(false);
            setReceiptNumber(data.mpesa_receipt_number || "");
            setState("success");
            toast.success("Payment successful!");
          } else if (data.status === "failed") {
            clearInterval(interval);
            setPolling(false);
            setState("failed");
            toast.error("Payment failed");
          } else if (data.status === "cancelled") {
            clearInterval(interval);
            setPolling(false);
            setState("cancelled");
          } else if (data.status === "timeout") {
            clearInterval(interval);
            setPolling(false);
            setState("timeout");
          }
        }
      } catch {}

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setPolling(false);
        setState("timeout");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const initiate = async () => {
    if (!phone || !user) return;
    setState("pending");

    try {
      const payload: any = { purpose, phone_number: phone };
      if (purpose === "wallet_topup") {
        payload.amount = Number(amount);
      } else {
        payload.errand_id = errandId;
      }

      const { data, error } = await supabase.functions.invoke("initiate-mpesa-stk", {
        body: payload,
      });

      if (error) throw new Error(error.message || "Failed to initiate payment");
      if (data?.setup_required) {
        toast.error("M-Pesa is not configured yet. Please add Daraja secrets in Lovable Cloud → Secrets.");
        setState("input");
        return;
      }
      if (data?.error) throw new Error(data.error);

      setAttemptId(data.attempt_id);
      pollStatus(data.attempt_id);
    } catch (err: any) {
      toast.error(err.message || "Payment initiation failed");
      setState("failed");
    }
  };

  const isTopup = purpose === "wallet_topup";
  const displayAmount = Number(amount);

  return (
    <AppLayout type="customer">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        {state === "input" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-light flex items-center justify-center mx-auto">
              <Smartphone className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground mb-1">Pay with M-Pesa</h1>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border shadow-premium">
              <p className="text-3xl font-bold text-primary mb-1">KES {displayAmount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {isTopup ? "Wallet Top Up — no platform fee" : "Total including 5% transaction fee"}
              </p>
            </div>

            {isTopup && (
              <div className="p-2.5 rounded-lg bg-emerald-light/50 border border-primary/10">
                <p className="text-xs text-primary font-medium">✓ No platform fee on top-ups — full amount credited to your wallet.</p>
              </div>
            )}

            <div className="space-y-2 text-left">
              <Label>M-Pesa Phone Number</Label>
              <Input
                placeholder="0712345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="h-12 rounded-xl text-center text-lg"
                type="tel"
              />
            </div>

            <Button className="w-full h-12 rounded-xl font-semibold" onClick={initiate} disabled={!phone || phone.length < 9}>
              Send M-Pesa Request
            </Button>
            <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Go Back
            </button>
          </motion.div>
        )}

        {state === "pending" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h2 className="text-lg font-display font-bold text-foreground">Waiting for M-Pesa</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Confirm payment on your phone. Enter your M-Pesa PIN to pay <strong>KES {displayAmount.toLocaleString()}</strong>
            </p>
            <p className="text-xs text-accent font-medium">Waiting for M-Pesa confirmation...</p>
            <p className="text-[10px] text-muted-foreground">This may take up to 2 minutes</p>
          </motion.div>
        )}

        {state === "success" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-light flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-display font-bold text-foreground">Payment Successful!</h2>
            <p className="text-sm text-muted-foreground">
              KES {displayAmount.toLocaleString()} received.{" "}
              {isTopup ? "Wallet topped up." : "Your errand is now live."}
            </p>
            {receiptNumber && (
              <div className="p-3 rounded-xl bg-emerald-light text-xs text-primary font-medium">
                M-Pesa Ref: {receiptNumber}
              </div>
            )}
            <Button className="w-full h-12 rounded-xl font-semibold" onClick={() => {
              if (errandId) navigate(`/customer/errand/${errandId}`);
              else navigate("/customer/wallet");
            }}>
              {errandId ? "View Errand" : "Back to Wallet"}
            </Button>
          </motion.div>
        )}

        {state === "failed" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-display font-bold text-foreground">Payment Failed</h2>
            <p className="text-sm text-muted-foreground">The M-Pesa payment was not completed. You can try again or pay manually via Till.</p>
            <div className="flex flex-col gap-2">
              <Button className="w-full h-12 rounded-xl font-semibold" onClick={() => setState("input")}>Try Again</Button>
              <Button variant="outline" className="w-full h-12 rounded-xl font-semibold" onClick={() => setState("manual")}>Pay Manually via Till</Button>
            </div>
          </motion.div>
        )}

        {state === "cancelled" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Ban className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-display font-bold text-foreground">Payment Cancelled</h2>
            <p className="text-sm text-muted-foreground">You cancelled the M-Pesa payment request.</p>
            <Button className="w-full h-12 rounded-xl font-semibold" onClick={() => setState("input")}>Try Again</Button>
          </motion.div>
        )}

        {state === "timeout" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-lg font-display font-bold text-foreground">Payment Timed Out</h2>
            <p className="text-sm text-muted-foreground">We didn't receive a response from M-Pesa in time. If money was deducted, it will be reconciled automatically.</p>
            <div className="flex flex-col gap-2">
              <Button className="w-full h-12 rounded-xl font-semibold" onClick={() => setState("input")}>Try Again</Button>
              <Button variant="outline" className="w-full h-12 rounded-xl font-semibold" onClick={() => setState("manual")}>Pay Manually via Till</Button>
            </div>
            <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground">Go Back</button>
          </motion.div>
        )}

        {state === "manual" && (
          <ManualPaymentFallback
            amount={displayAmount}
            purpose={purpose}
            errandId={errandId}
            onSuccess={() => {
              if (errandId) navigate(`/customer/errand/${errandId}`);
              else navigate("/customer/wallet");
            }}
            onBack={() => setState("input")}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default MpesaPay;
