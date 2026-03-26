import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MpesaPayment from "@/components/MpesaPayment";
import {
  Package, ShoppingBag, FileText, Clock, Truck, Wrench,
  ArrowLeft, CheckCircle2,
} from "lucide-react";

const services = [
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "document", label: "Document Drop-off", icon: FileText },
  { id: "queueing", label: "Queueing", icon: Clock },
  { id: "parcel", label: "Parcel Pickup", icon: Package },
  { id: "custom", label: "Custom Errand", icon: Wrench },
];

const PostErrand = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"service" | "form" | "payment" | "success">("service");
  const [selectedService, setSelectedService] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", pickup: "", dropoff: "",
    date: "", budget: "", recipientName: "", recipientPhone: "", notes: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (step === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 pb-20">
        <div className="animate-fade-in text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <CheckCircle2 size={32} className="text-primary" />
          </div>
          <h1 className="mt-5 font-display text-xl font-bold text-foreground">Errand Posted!</h1>
          <p className="mt-2 text-sm text-muted-foreground">We'll match you with a trusted runner shortly. You'll get an SMS notification.</p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Dashboard</Button>
            <Button onClick={() => { setStep("service"); setSelectedService(""); setForm({ title: "", description: "", pickup: "", dropoff: "", date: "", budget: "", recipientName: "", recipientPhone: "", notes: "" }); }}>
              Post Another
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (step === "payment") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-5 py-3">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <button onClick={() => setStep("form")} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></button>
            <h1 className="font-display font-bold text-foreground">Payment</h1>
          </div>
        </header>
        <main className="mx-auto max-w-md px-5 py-6">
          <MpesaPayment amount={Number(form.budget) || 500} onSuccess={() => setStep("success")} onCancel={() => setStep("form")} />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-5 py-3">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button onClick={() => step === "form" ? setStep("service") : navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-bold text-foreground">{step === "service" ? "Post an Errand" : "Errand Details"}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-6">
        {step === "service" ? (
          <div className="animate-fade-in">
            <p className="text-sm text-muted-foreground">What do you need help with?</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s.id); setStep("form"); }}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/30 hover:shadow-elevated active:scale-[0.97]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <s.icon size={20} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); setStep("payment"); }}
            className="animate-fade-in space-y-4"
          >
            <Badge selectedService={selectedService} />

            <div className="space-y-1.5">
              <Label>Errand Title</Label>
              <Input placeholder="e.g. Buy groceries from Naivas" value={form.title} onChange={(e) => update("title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Describe what you need done..." value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pickup</Label>
                <Input placeholder="e.g. Naivas Thika" value={form.pickup} onChange={(e) => update("pickup", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Drop-off</Label>
                <Input placeholder="e.g. Makongeni" value={form.dropoff} onChange={(e) => update("dropoff", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date & Time</Label>
                <Input type="datetime-local" value={form.date} onChange={(e) => update("date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Budget (KES)</Label>
                <Input type="number" placeholder="e.g. 500" value={form.budget} onChange={(e) => update("budget", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Recipient Name</Label>
                <Input placeholder="Full name" value={form.recipientName} onChange={(e) => update("recipientName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Recipient Phone</Label>
                <Input type="tel" placeholder="0712 345 678" value={form.recipientPhone} onChange={(e) => update("recipientPhone", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Any extra details for the runner..." value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-border bg-muted/50 p-4 space-y-2">
              <p className="font-display text-xs font-bold text-foreground uppercase tracking-wide">Summary</p>
              <SRow label="Service" value={services.find((s) => s.id === selectedService)?.label || ""} />
              <SRow label="Errand" value={form.title} />
              <SRow label="Pickup" value={form.pickup} />
              <SRow label="Drop-off" value={form.dropoff} />
              {form.budget && <SRow label="Budget" value={`KES ${form.budget}`} />}
              <SRow label="Payment" value="M-Pesa" />
            </div>

            <Button type="submit" className="w-full" size="lg">Continue to Payment</Button>
          </form>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

const Badge = ({ selectedService }: { selectedService: string }) => {
  const svc = services.find((s) => s.id === selectedService);
  if (!svc) return null;
  return (
    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      <svc.icon size={14} /> {svc.label}
    </div>
  );
};

const SRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground truncate ml-4">{value || "—"}</span>
  </div>
);

export default PostErrand;
