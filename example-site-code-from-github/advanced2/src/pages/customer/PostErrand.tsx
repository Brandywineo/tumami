import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, ArrowRight, Loader2, ChevronDown, ChevronUp,
  Search, Package, Layers, ShoppingBag, Gift, ShoppingCart,
  UtensilsCrossed, Landmark, Building2, SearchCheck, Truck,
  ShieldAlert, Info, Minus, Plus, Wallet, Smartphone,
  Star, User, UserCheck, Zap,
} from "lucide-react";
import UseMyLocationButton from "@/components/location/UseMyLocationButton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  SERVICES, ServiceConfig, ServiceKey,
  calculateClientPricing, calculateRunnerPayout,
  PAYMENT_SAFETY_LONG, PAYMENT_SAFETY_SHORT,
} from "@/lib/pricing";

const iconMap: Record<string, any> = {
  Search, Package, Layers, ShoppingBag, Gift, ShoppingCart,
  UtensilsCrossed, Landmark, Building2, SearchCheck, Truck,
};

interface RunnerOption {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  avg_rating: number;
  total_ratings: number;
  completed_errands: number;
  bio: string | null;
  town: string | null;
}

const PostErrand = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [saving, setSaving] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"stk_push" | "wallet">("stk_push");

  // Runner assignment state
  const [assignmentMode, setAssignmentMode] = useState<"auto" | "preferred">("auto");
  const [preferredRunners, setPreferredRunners] = useState<RunnerOption[]>([]);
  const [selectedRunnerId, setSelectedRunnerId] = useState<string | null>(null);
  const [runnerSearchQuery, setRunnerSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RunnerOption[]>([]);
  const [searchingRunners, setSearchingRunners] = useState(false);
  const [loadingPreferred, setLoadingPreferred] = useState(false);

  const [selectedKey, setSelectedKey] = useState<ServiceKey | "">("");
  const [locationKey, setLocationKey] = useState("");
  const [urgencyKey, setUrgencyKey] = useState("");
  const [extraPickups, setExtraPickups] = useState(0);
  const [itemCount, setItemCount] = useState(1);

  const [form, setForm] = useState({
    description: "", pickup: "", dropoff: "", date: "",
    recipientName: "", recipientPhone: "", notes: "",
    shopName: "", platform: "", shopLink: "", sellerPhone: "", concern: "",
  });
  const u = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  useEffect(() => {
    if (!user) return;
    supabase.from("wallet_accounts").select("balance").eq("user_id", user.id).single()
      .then(({ data }) => setWalletBalance(data?.balance || 0));
  }, [user]);

  // Load preferred runners when assignment mode changes
  useEffect(() => {
    if (assignmentMode !== "preferred" || !user) return;
    setLoadingPreferred(true);
    const load = async () => {
      const { data } = await supabase.from("preferred_runners")
        .select("runner_id").eq("client_id", user.id);
      if (data && data.length > 0) {
        const enriched = await Promise.all(data.map(async (pref) => {
          const { data: profile } = await supabase.rpc("get_runner_profile", { p_runner_id: pref.runner_id });
          return profile as any;
        }));
        setPreferredRunners(enriched.filter(r => r && !r.error));
      }
      setLoadingPreferred(false);
    };
    load();
  }, [assignmentMode, user]);

  // Search runners by username
  useEffect(() => {
    if (!runnerSearchQuery || runnerSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchingRunners(true);
    const timeout = setTimeout(async () => {
      const { data } = await supabase.rpc("search_runners", { p_query: runnerSearchQuery });
      setSearchResults((data as any[]) || []);
      setSearchingRunners(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [runnerSearchQuery]);

  const service = SERVICES.find(s => s.key === selectedKey) as ServiceConfig | undefined;
  const isShopCheck = selectedKey === "shop_check";
  const isFixedPrice = service?.pricingType === "fixed";
  const isPerItem = service?.perItem;

  let serviceAmount = 0;
  let isCustomQuote = false;

  if (service) {
    if (isFixedPrice) {
      if (selectedKey === "parcel_consolidation") {
        const baseLoc = service.locations?.[0];
        serviceAmount = (baseLoc?.price || 150) + extraPickups * (service.extraPickupCost || 50);
      } else if (service.locations) {
        const loc = service.locations.find(l => l.key === locationKey);
        if (loc?.price === null) isCustomQuote = true;
        else serviceAmount = loc?.price || 0;
      }
    } else {
      const urg = service.urgencyOptions?.find(o => o.key === urgencyKey);
      if (urg) serviceAmount = isPerItem ? urg.price * itemCount : urg.price;
    }
  }

  const pricing = calculateClientPricing(serviceAmount);
  const runnerPayout = calculateRunnerPayout(serviceAmount);
  const title = form.description.slice(0, 60) || `${service?.label || "Errand"}`;
  const canPayWithWallet = walletBalance >= pricing.total && pricing.total > 0;

  const canProceedStep2 = isShopCheck ? !!form.shopName.trim() : !!form.description.trim();
  const canProceedStep3 = (() => {
    if (!service) return false;
    if (isCustomQuote) return false;
    if (isFixedPrice) {
      if (selectedKey === "shop_check" && !locationKey) return false;
      return serviceAmount > 0;
    }
    return !!urgencyKey && serviceAmount > 0;
  })();

  const handleSubmit = async () => {
    if (!user || !service) return;
    setSaving(true);
    try {
      // Block self-assignment on client side too
      if (assignmentMode === "preferred" && selectedRunnerId === user.id) {
        toast.error("You cannot assign yourself as the runner for your own errand.");
        setSaving(false);
        return;
      }

      const { data: errand, error } = await supabase.from("errands").insert({
        customer_id: user.id,
        service_type: selectedKey,
        title,
        description: form.description,
        pickup_location: form.pickup,
        dropoff_location: form.dropoff,
        preferred_date: form.date,
        base_amount: serviceAmount,
        recipient_name: form.recipientName,
        recipient_phone: form.recipientPhone,
        notes: form.notes,
        payment_method: paymentMethod,
        preferred_runner_id: assignmentMode === "preferred" ? selectedRunnerId : null,
        status: "pending_payment" as const,
      }).select().single();
      if (error) throw error;

      if (isShopCheck && errand) {
        await supabase.from("shop_check_requests").insert({
          customer_id: user.id, errand_id: errand.id,
          shop_name: form.shopName, platform: form.platform,
          shop_link: form.shopLink, seller_phone: form.sellerPhone,
          concern: form.concern,
        });
      }

      if (paymentMethod === "wallet" && errand) {
        const { data: result, error: walletErr } = await supabase.rpc("pay_errand_from_wallet", {
          p_errand_id: errand.id, p_user_id: user.id,
        });
        if (walletErr) throw walletErr;
        const res = result as any;
        if (!res?.success) throw new Error(res?.error || "Wallet payment failed");
        toast.success("Paid from wallet! Errand is now live.");
        navigate(`/customer/errand/${errand.id}`);
      } else {
        toast.success("Errand created! Proceeding to payment...");
        navigate("/customer/mpesa-pay", { state: { amount: pricing.total, title, errandId: errand?.id, purpose: "errand_payment" } });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create errand");
    } finally { setSaving(false); }
  };

  const goBack = () => {
    if (step === 1) navigate(-1);
    else setStep((step - 1) as 1 | 2 | 3);
  };

  const selectedRunner = assignmentMode === "preferred" && selectedRunnerId
    ? [...preferredRunners, ...searchResults].find(r => r.user_id === selectedRunnerId)
    : null;

  return (
    <AppLayout type="customer">
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex gap-1.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground font-medium">{step}/4</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-foreground">What do you need?</h1>
                <p className="text-sm text-muted-foreground mt-1">Pick a service to get started</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SERVICES.map(s => {
                  const Icon = iconMap[s.icon] || Package;
                  return (
                    <button key={s.key} onClick={() => {
                      setSelectedKey(s.key);
                      setLocationKey(s.pricingType === "fixed" && s.locations?.length === 1 ? s.locations[0].key : "");
                      setUrgencyKey("");
                      setStep(2);
                    }}
                      className="p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/40 hover:shadow-md transition-all text-left active:scale-[0.97]">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-sm text-foreground leading-tight">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {isShopCheck ? "Which shop?" : "What do you need done?"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isShopCheck ? "Tell us about the shop to check" : "Describe it in your own words"}
                </p>
              </div>
              {isShopCheck ? (
                <div className="space-y-4">
                  <Field label="Shop Name" placeholder="e.g. Nairobi Trends" value={form.shopName} onChange={v => u("shopName", v)} />
                  <Field label="Platform" placeholder="Instagram, TikTok, WhatsApp..." value={form.platform} onChange={v => u("platform", v)} />
                  <Field label="Shop Link or Username" placeholder="@shopname or URL" value={form.shopLink} onChange={v => u("shopLink", v)} />
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Why are you concerned?</Label>
                    <Textarea placeholder="e.g. They asked for payment before delivery" value={form.concern} onChange={e => u("concern", e.target.value)} className="rounded-xl min-h-[80px]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Describe your errand</Label>
                  <Textarea
                    placeholder={service?.examplePlaceholder || "e.g. Buy 2kg sugar and bread from Naivas Thika Road and deliver to Juja Gate B"}
                    value={form.description}
                    onChange={e => u("description", e.target.value)}
                    className="rounded-xl min-h-[120px] text-base"
                    autoFocus
                  />
                </div>
              )}
              {service?.showSafetyGuidance && (
                <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 flex gap-2 text-xs text-accent">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{PAYMENT_SAFETY_SHORT}</span>
                </div>
              )}
              <Button className="w-full h-12 rounded-xl font-semibold gap-2" onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 3 && service && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {isFixedPrice ? "Select option" : "How urgent?"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isFixedPrice ? "Choose your location or option" : "Less time = higher price"}
                </p>
              </div>

              {isFixedPrice && selectedKey === "shop_check" && service.locations && (
                <div className="space-y-2">
                  {service.locations.map(loc => (
                    <button key={loc.key} onClick={() => setLocationKey(loc.key)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${locationKey === loc.key ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-foreground">{loc.label}</span>
                        <span className="font-bold text-sm text-primary">
                          {loc.price !== null ? `KES ${loc.price.toLocaleString()}` : "Custom Quote"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isFixedPrice && selectedKey === "parcel_pickup" && (
                <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">CBD Flat Rate</span>
                    <span className="font-bold text-primary">KES 100</span>
                  </div>
                </div>
              )}

              {isFixedPrice && selectedKey === "parcel_consolidation" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-foreground">Base (first pickup included)</span>
                      <span className="font-bold text-primary">KES 150</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Extra pickup points (KES 50 each)</Label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setExtraPickups(Math.max(0, extraPickups - 1))} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                      <span className="text-lg font-bold w-8 text-center">{extraPickups}</span>
                      <button onClick={() => setExtraPickups(extraPickups + 1)} className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              )}

              {!isFixedPrice && service.urgencyOptions && (
                <div className="space-y-2">
                  {service.urgencyOptions.map(opt => (
                    <button key={opt.key} onClick={() => setUrgencyKey(opt.key)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${urgencyKey === opt.key ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm text-foreground">{opt.label}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                        </div>
                        <span className="font-bold text-sm text-primary">
                          KES {opt.price.toLocaleString()}{isPerItem ? "/item" : ""}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isPerItem && urgencyKey && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Number of items</Label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setItemCount(Math.max(1, itemCount - 1))} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                    <span className="text-lg font-bold w-8 text-center">{itemCount}</span>
                    <button onClick={() => setItemCount(itemCount + 1)} className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              {isCustomQuote && (
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-center">
                  <Info className="w-5 h-5 text-accent mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Custom Quote Required</p>
                  <p className="text-xs text-muted-foreground mt-1">This location requires a custom quote. Please contact support.</p>
                </div>
              )}

              {serviceAmount > 0 && !isCustomQuote && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="text-foreground font-medium">KES {serviceAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction Fee (5%)</span>
                    <span className="text-foreground font-medium">KES {pricing.transactionFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-bold">
                    <span className="text-foreground">Total to Pay</span>
                    <span className="text-primary">KES {pricing.total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <Button className="w-full h-12 rounded-xl font-semibold gap-2" onClick={() => setStep(4)} disabled={!canProceedStep3}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 4 && service && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-foreground">Confirm & Pay</h1>
                <p className="text-sm text-muted-foreground mt-1">Add location details, choose runner & payment</p>
              </div>

              {!isShopCheck && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Pickup</Label>
                      <UseMyLocationButton onLocationFound={v => u("pickup", v)} />
                    </div>
                    <Input placeholder="e.g. Naivas Thika Road" value={form.pickup} onChange={e => u("pickup", e.target.value)} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Dropoff</Label>
                      <UseMyLocationButton onLocationFound={v => u("dropoff", v)} />
                    </div>
                    <Input placeholder="e.g. Juja, Gate B" value={form.dropoff} onChange={e => u("dropoff", e.target.value)} className="h-12 rounded-xl" />
                  </div>
                </>
              )}

              {/* Runner Assignment Mode */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">How should we assign a runner?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setAssignmentMode("auto"); setSelectedRunnerId(null); }}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${assignmentMode === "auto" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <Zap className="w-5 h-5 text-primary mb-1" />
                    <p className="text-sm font-semibold text-foreground">Automatic</p>
                    <p className="text-[10px] text-muted-foreground">System finds a runner</p>
                  </button>
                  <button onClick={() => setAssignmentMode("preferred")}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${assignmentMode === "preferred" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <UserCheck className="w-5 h-5 text-primary mb-1" />
                    <p className="text-sm font-semibold text-foreground">My Runner</p>
                    <p className="text-[10px] text-muted-foreground">Choose a preferred runner</p>
                  </button>
                </div>
              </div>

              {/* Preferred Runner Selection */}
              <AnimatePresence>
                {assignmentMode === "preferred" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search runner by username..."
                        value={runnerSearchQuery}
                        onChange={e => setRunnerSearchQuery(e.target.value)}
                        className="h-11 rounded-xl pl-9"
                      />
                      {searchingRunners && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
                    </div>

                    {/* Search results */}
                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Search results</p>
                        {searchResults.map(r => (
                          <RunnerCard key={r.user_id} runner={r} selected={selectedRunnerId === r.user_id} onSelect={() => setSelectedRunnerId(r.user_id)} />
                        ))}
                      </div>
                    )}

                    {/* Preferred runners list */}
                    {loadingPreferred ? (
                      <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
                    ) : preferredRunners.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Your preferred runners</p>
                        {preferredRunners.map(r => (
                          <RunnerCard key={r.user_id} runner={r} selected={selectedRunnerId === r.user_id} onSelect={() => setSelectedRunnerId(r.user_id)} />
                        ))}
                      </div>
                    ) : !runnerSearchQuery && (
                      <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                        <p className="text-sm text-muted-foreground">No preferred runners yet. Use the search above to find a runner by username.</p>
                      </div>
                    )}

                    {selectedRunnerId && (
                      <p className="text-xs text-primary font-medium flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> Request will be sent to this runner first
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <button onClick={() => setShowExtras(!showExtras)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <span>More details (optional)</span>
                {showExtras ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {showExtras && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                    {isShopCheck ? (
                      <Field label="Seller Phone" placeholder="0712345678" value={form.sellerPhone} onChange={v => u("sellerPhone", v)} />
                    ) : (
                      <>
                        <Field label="Preferred Time" placeholder="e.g. Today 3 PM" value={form.date} onChange={v => u("date", v)} />
                        <Field label="Recipient Name" placeholder="Jane Wanjiku" value={form.recipientName} onChange={v => u("recipientName", v)} />
                        <Field label="Recipient Phone" placeholder="0712345678" value={form.recipientPhone} onChange={v => u("recipientPhone", v)} />
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Notes</Label>
                          <Textarea placeholder="Extra instructions..." value={form.notes} onChange={e => u("notes", e.target.value)} className="rounded-xl min-h-[70px]" />
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Payment method selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPaymentMethod("stk_push")}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${paymentMethod === "stk_push" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <Smartphone className="w-5 h-5 text-primary mb-1" />
                    <p className="text-sm font-semibold text-foreground">M-Pesa</p>
                    <p className="text-[10px] text-muted-foreground">STK Push</p>
                  </button>
                  <button onClick={() => setPaymentMethod("wallet")}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${paymentMethod === "wallet" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <Wallet className="w-5 h-5 text-primary mb-1" />
                    <p className="text-sm font-semibold text-foreground">Wallet</p>
                    <p className="text-[10px] text-muted-foreground">Bal: KES {walletBalance.toLocaleString()}</p>
                  </button>
                </div>
                {paymentMethod === "wallet" && !canPayWithWallet && pricing.total > 0 && (
                  <p className="text-xs text-destructive font-medium">Insufficient wallet balance. Top up or use M-Pesa.</p>
                )}
                {paymentMethod === "wallet" && (
                  <p className="text-[10px] text-muted-foreground">The 5% transaction fee applies when paying for errands, including wallet payments. No fee on wallet top-ups.</p>
                )}
              </div>

              {service?.showSafetyGuidance && (
                <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 flex gap-2 text-xs text-accent">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{PAYMENT_SAFETY_LONG}</span>
                </div>
              )}

              {serviceAmount > 0 && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="text-foreground font-medium">KES {serviceAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction Fee (5%)</span>
                    <span className="text-foreground font-medium">KES {pricing.transactionFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-bold">
                    <span className="text-foreground">Total to Pay</span>
                    <span className="text-primary">KES {pricing.total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <Button className="w-full h-12 rounded-xl font-semibold gap-2" onClick={handleSubmit}
                disabled={saving || serviceAmount <= 0 || (paymentMethod === "wallet" && !canPayWithWallet) || (assignmentMode === "preferred" && !selectedRunnerId)}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : (
                  paymentMethod === "wallet"
                    ? <>Pay KES {pricing.total.toLocaleString()} from Wallet <Wallet className="w-4 h-4" /></>
                    : <>Pay KES {pricing.total.toLocaleString()} via M-Pesa <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

/* Runner selection card */
const RunnerCard = ({ runner, selected, onSelect }: { runner: RunnerOption; selected: boolean; onSelect: () => void }) => (
  <button onClick={onSelect}
    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {runner.avatar_url ? (
          <img src={runner.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <User className="w-5 h-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{runner.full_name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {runner.username && <span>@{runner.username}</span>}
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 text-accent fill-accent" />
            <span className="text-foreground font-medium">{runner.avg_rating}</span>
          </div>
          <span>{runner.completed_errands} jobs</span>
        </div>
      </div>
      {selected && <UserCheck className="w-5 h-5 text-primary flex-shrink-0" />}
    </div>
  </button>
);

const Field = ({ label, placeholder, value, onChange, type = "text" }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">{label}</Label>
    <Input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="h-12 rounded-xl" />
  </div>
);

export default PostErrand;
