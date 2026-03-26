import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle2, Clock, XCircle, Upload } from "lucide-react";

const towns = ["Nairobi", "Thika", "Ruiru", "Juja", "Kiambu", "Mombasa", "Nakuru", "Eldoret"];
const transports = ["Walking", "Bicycle", "Boda Boda (Motorcycle)", "Car", "TukTuk", "Public Transport"];
const availabilities = ["Full-time", "Part-time (Mornings)", "Part-time (Evenings)", "Weekends only", "Flexible"];

type Status = "not_submitted" | "under_review" | "verified" | "rejected";

const RunnerVerification = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("not_submitted");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", nationalId: "", town: "", transport: "",
    emergencyContact: "", availability: "", notes: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setStatus("under_review"); }, 1500);
  };

  const statusUI: Record<Status, { icon: any; title: string; desc: string; color: string }> = {
    not_submitted: { icon: Upload, title: "", desc: "", color: "" },
    under_review: { icon: Clock, title: "Verification Under Review", desc: "We're reviewing your documents. This usually takes 24-48 hours. You'll receive an SMS once verified.", color: "text-accent" },
    verified: { icon: CheckCircle2, title: "You're Verified!", desc: "You can now accept errands and start earning.", color: "text-primary" },
    rejected: { icon: XCircle, title: "Verification Rejected", desc: "Please update your details and resubmit. Contact support if you need help.", color: "text-destructive" },
  };

  if (status !== "not_submitted") {
    const s = statusUI[status];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <div className="animate-fade-in text-center max-w-xs">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${status === "under_review" ? "bg-accent/15" : status === "verified" ? "bg-primary/10" : "bg-destructive/10"}`}>
            <s.icon size={32} className={s.color} />
          </div>
          <h1 className="mt-5 font-display text-xl font-bold text-foreground">{s.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
          <Button variant="outline" className="mt-6" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-5 py-3">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></button>
          <h1 className="font-display font-bold text-foreground">Runner Verification</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-muted-foreground mb-6">Complete your profile to start accepting errands and earning with Tumame.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input placeholder="e.g. James Mwangi" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input type="tel" placeholder="0712 345 678" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>National ID Number</Label>
            <Input placeholder="e.g. 12345678" value={form.nationalId} onChange={(e) => update("nationalId", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Town</Label>
            <Select value={form.town} onValueChange={(v) => update("town", v)}>
              <SelectTrigger><SelectValue placeholder="Select your town" /></SelectTrigger>
              <SelectContent>{towns.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Means of Transport</Label>
            <Select value={form.transport} onValueChange={(v) => update("transport", v)}>
              <SelectTrigger><SelectValue placeholder="Select transport type" /></SelectTrigger>
              <SelectContent>{transports.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Emergency Contact</Label>
            <Input type="tel" placeholder="0700 000 000" value={form.emergencyContact} onChange={(e) => update("emergencyContact", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Availability</Label>
            <Select value={form.availability} onValueChange={(v) => update("availability", v)}>
              <SelectTrigger><SelectValue placeholder="Select availability" /></SelectTrigger>
              <SelectContent>{availabilities.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Upload placeholders */}
          <div className="space-y-3">
            <Label>Upload Documents</Label>
            <div className="grid grid-cols-2 gap-3">
              <UploadPlaceholder label="National ID" />
              <UploadPlaceholder label="Selfie Photo" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Additional Notes</Label>
            <Textarea placeholder="Anything else we should know..." value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Submit for Verification"}
          </Button>
        </form>
      </main>
    </div>
  );
};

const UploadPlaceholder = ({ label }: { label: string }) => (
  <button
    type="button"
    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border p-6 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
  >
    <Upload size={20} />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export default RunnerVerification;
