import { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Upload, CheckCircle, Clock, XCircle, ArrowLeft, Loader2, AlertTriangle, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const RunnerVerification = () => {
  const navigate = useNavigate();
  const { user, verificationStatus, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [form, setForm] = useState({
    full_name: "", phone: "", national_id: "", town: "",
    transport: "", emergency_contact: "", availability: "full_time", bio: "",
  });
  const [files, setFiles] = useState<{ idFront: File | null; idBack: File | null; selfie: File | null; goodConduct: File | null }>({
    idFront: null, idBack: null, selfie: null, goodConduct: null,
  });
  const allFilesUploaded = !!(files.idFront && files.idBack && files.selfie && files.goodConduct);
  const setFileField = (field: keyof typeof files) => (f: File | null) => setFiles(p => ({ ...p, [field]: f }));

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("runner_verifications").select("*").eq("user_id", user.id).single();
      if (data) {
        setExisting(data);
        setForm({
          full_name: data.full_name || "",
          phone: data.phone || "",
          national_id: data.national_id || "",
          town: data.town || "",
          transport: data.transport || "",
          emergency_contact: data.emergency_contact || "",
          availability: data.availability || "full_time",
          bio: data.bio || "",
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const update = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.full_name || !form.phone || !form.national_id || !form.town || !form.transport) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!allFilesUploaded) {
      toast.error("Please upload all required documents");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
        full_name: form.full_name,
        phone: form.phone,
        national_id: form.national_id,
        town: form.town,
        transport: form.transport,
        emergency_contact: form.emergency_contact,
        availability: form.availability,
        bio: form.bio,
        status: "under_review" as const,
      };
      if (existing) {
        const { error } = await supabase.from("runner_verifications").update(payload).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("runner_verifications").insert(payload);
        if (error) throw error;
      }
      await refreshProfile();
      toast.success("Application submitted!");
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <AppLayout type="runner"><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div></AppLayout>;
  }

  const effectiveStatus = verificationStatus || (existing?.status) || "not_submitted";

  // Under review screen
  if (effectiveStatus === "under_review") {
    return (
      <AppLayout type="runner">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-8">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground mb-2">Application Under Review</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Your runner application has been submitted and is being reviewed. You'll get access to the runner dashboard once approved.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-premium space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Submitted Details</h3>
            <SummaryRow label="Name" value={existing?.full_name} />
            <SummaryRow label="Phone" value={existing?.phone} />
            <SummaryRow label="Town" value={existing?.town} />
            <SummaryRow label="Transport" value={existing?.transport} />
            <SummaryRow label="ID Number" value={existing?.national_id} />
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground text-center">
              Need help? Contact support at <span className="text-primary font-medium">support@tumame.co.ke</span>
            </p>
          </div>

          <Button variant="outline" className="w-full h-12 rounded-xl font-semibold" onClick={() => navigate("/customer")}>
            Use Tumame as Customer
          </Button>
        </motion.div>
      </AppLayout>
    );
  }

  // Rejected screen
  if (effectiveStatus === "rejected") {
    return (
      <AppLayout type="runner">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-4">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground mb-2">Verification Not Approved</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Your application was not approved. Please review the feedback below and resubmit.
            </p>
          </div>

          {existing?.rejection_reason && (
            <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Reason</p>
                  <p className="text-sm text-muted-foreground">{existing.rejection_reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Show the form below for re-submission */}
          {renderForm()}
        </motion.div>
      </AppLayout>
    );
  }

  // Verified screen — shouldn't normally land here, but handle gracefully
  if (effectiveStatus === "verified") {
    return (
      <AppLayout type="runner">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-8">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-light flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground mb-2">You're Verified! 🎉</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              You're approved to accept errands on Tumame.
            </p>
          </div>
          <Button className="w-full h-12 rounded-xl font-semibold" onClick={() => navigate("/runner")}>
            Go to Runner Dashboard
          </Button>
        </motion.div>
      </AppLayout>
    );
  }

  // Not submitted — show form
  return (
    <AppLayout type="runner">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-display font-bold text-foreground">Runner Verification</h1>
        </div>

        <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Complete verification to start earning</p>
              <p className="text-xs text-muted-foreground mt-1">Submit your details and documents. Your application will be reviewed and you'll get access to errands once approved.</p>
            </div>
          </div>
        </div>

        {renderForm()}
      </div>
    </AppLayout>
  );

  function renderForm() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Full Name <span className="text-destructive">*</span></Label>
          <Input value={form.full_name} onChange={e => update("full_name", e.target.value)} placeholder="Peter Mwangi" className="h-12 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Phone Number <span className="text-destructive">*</span></Label>
          <Input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="0723456789" className="h-12 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>National ID Number <span className="text-destructive">*</span></Label>
          <Input value={form.national_id} onChange={e => update("national_id", e.target.value)} placeholder="12345678" className="h-12 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Town <span className="text-destructive">*</span></Label>
          <Input value={form.town} onChange={e => update("town", e.target.value)} placeholder="Nairobi, Thika, Mombasa..." className="h-12 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Means of Transport <span className="text-destructive">*</span></Label>
          <Select value={form.transport} onValueChange={v => update("transport", v)}>
            <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select transport" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="walking">Walking</SelectItem>
              <SelectItem value="bicycle">Bicycle</SelectItem>
              <SelectItem value="motorbike">Motorbike</SelectItem>
              <SelectItem value="car">Car</SelectItem>
              <SelectItem value="matatu">Matatu / Public Transport</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Emergency Contact</Label>
          <Input value={form.emergency_contact} onChange={e => update("emergency_contact", e.target.value)} placeholder="0712345678" className="h-12 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Availability</Label>
          <Select value={form.availability} onValueChange={v => update("availability", v)}>
            <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time">Full Time</SelectItem>
              <SelectItem value="part_time">Part Time</SelectItem>
              <SelectItem value="weekends">Weekends Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Short Bio / Introduction</Label>
          <Textarea value={form.bio} onChange={e => update("bio", e.target.value)} placeholder="Tell us briefly about yourself and why you'd like to be a Tumame runner..." className="rounded-xl min-h-[80px] resize-none" />
        </div>

        {/* Document uploads */}
        <div>
          <Label className="mb-3 block">Documents & Photos <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-2 gap-3">
            <SimpleFileUpload label="ID Front" accept="image/*" onFile={setFileField("idFront")} />
            <SimpleFileUpload label="ID Back" accept="image/*" onFile={setFileField("idBack")} />
            <SimpleFileUpload label="Selfie" accept="image/*" onFile={setFileField("selfie")} />
            <SimpleFileUpload label="Certificate of Good Conduct" accept="image/*,.pdf" onFile={setFileField("goodConduct")} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Tap to upload files from your device.</p>
        </div>

        <Button className="w-full h-12 rounded-xl font-semibold gap-2" onClick={handleSubmit} disabled={submitting || !allFilesUploaded}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {existing ? "Resubmit Application" : "Submit for Verification"}
        </Button>
        {!allFilesUploaded && (
          <p className="text-[10px] text-muted-foreground text-center">Upload all 4 documents above to submit</p>
        )}
      </div>
    );
  }
};

const SummaryRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground capitalize">{value || "—"}</span>
  </div>
);

const SimpleFileUpload = ({ label, accept, onFile }: { label: string; accept: string; onFile: (f: File | null) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (selected) { setFile(selected); onFile(selected); }
  };

  const clearFile = () => {
    setFile(null); onFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="relative">
      <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={handleChange} tabIndex={-1} />
      {file ? (
        <div className="p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 text-center relative">
          <CheckCircle className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <p className="text-xs text-foreground font-medium truncate px-2">{file.name}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="text-[10px] text-primary hover:underline">Replace</button>
            <button type="button" onClick={clearFile} className="text-[10px] text-destructive hover:underline">Remove</button>
          </div>
        </div>
      ) : (
        <div onClick={() => inputRef.current?.click()} className="p-5 rounded-2xl border-2 border-dashed border-border text-center cursor-pointer hover:border-primary/30 active:border-primary/40 transition-colors">
          <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-xs text-foreground font-medium">{label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Tap to upload</p>
        </div>
      )}
    </div>
  );
};

export default RunnerVerification;
