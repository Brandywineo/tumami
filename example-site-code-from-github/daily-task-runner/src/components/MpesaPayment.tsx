import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Smartphone } from "lucide-react";

interface MpesaPaymentProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const MpesaPayment = ({ amount, onSuccess, onCancel }: MpesaPaymentProps) => {
  const [step, setStep] = useState<"input" | "pending" | "success" | "failed">("input");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const validatePhone = (p: string) => /^(?:0|\+254|254)[17]\d{8}$/.test(p.replace(/\s/g, ""));

  const handlePay = () => {
    if (!validatePhone(phone)) { setError("Enter a valid Kenyan phone number."); return; }
    setError("");
    setStep("pending");
    setTimeout(() => setStep("success"), 3000);
  };

  if (step === "success") {
    return (
      <div className="animate-fade-in text-center py-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <CheckCircle2 size={28} className="text-primary" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-foreground">Payment Successful</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">KES {amount.toLocaleString()} paid via M-Pesa</p>
        <p className="mt-1 text-xs text-muted-foreground">Ref: TUM{Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
        <Button className="mt-5" onClick={onSuccess}>Continue</Button>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="animate-fade-in text-center py-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <XCircle size={28} className="text-destructive" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-foreground">Payment Failed</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">The M-Pesa transaction was not completed.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => setStep("input")}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (step === "pending") {
    return (
      <div className="animate-fade-in text-center py-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Smartphone size={28} className="text-primary animate-pulse-slow" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-foreground">Confirm on your phone</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">An M-Pesa STK push has been sent to <span className="font-medium text-foreground">{phone}</span></p>
        <p className="mt-1 text-xs text-muted-foreground">Enter your M-Pesa PIN to complete payment</p>
        <Loader2 size={20} className="mx-auto mt-5 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">Waiting for M-Pesa confirmation...</p>
        <button onClick={() => setStep("failed")} className="mt-4 text-xs text-muted-foreground hover:text-foreground underline">
          Cancel payment
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
        <p className="text-xs text-muted-foreground">Amount to pay</p>
        <p className="font-display text-2xl font-bold text-foreground">KES {amount.toLocaleString()}</p>
      </div>

      <div className="space-y-1.5">
        <Label>M-Pesa Phone Number</Label>
        <Input type="tel" placeholder="0712 345 678" value={phone} onChange={(e) => { setPhone(e.target.value); setError(""); }} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Button className="w-full" onClick={handlePay}>Pay with M-Pesa</Button>

      <button onClick={onCancel} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
        Cancel
      </button>
    </div>
  );
};

export default MpesaPayment;
