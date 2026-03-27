// =============================================
// TUMAME CENTRAL PRICING CONFIG
// All service prices in one place for easy editing
// =============================================

export const CLIENT_FEE_RATE = 0.05; // 5% Transaction Fee
export const RUNNER_FEE_RATE = 0.10; // 10% Platform Fee

// ---- Service categories ----
export type ServiceKey =
  | "shop_check"
  | "parcel_pickup"
  | "parcel_consolidation"
  | "personal_shopping"
  | "gift_shopping"
  | "grocery_shopping"
  | "meal_delivery"
  | "bank_run"
  | "govt_office"
  | "find_item"
  | "delivery";

export type PricingType = "fixed" | "time_based";

export type UrgencyOption = {
  key: string;
  label: string;
  description: string;
  price: number;
};

export type LocationOption = {
  key: string;
  label: string;
  price: number | null; // null = "Custom Quote"
};

export type ServiceConfig = {
  key: ServiceKey;
  label: string;
  icon: string; // lucide icon name
  pricingType: PricingType;
  color: string;
  /** For fixed-price services with location variants */
  locations?: LocationOption[];
  /** For parcel consolidation: extra pickup cost */
  extraPickupCost?: number;
  /** For time-based services */
  urgencyOptions?: UrgencyOption[];
  /** For per-item services (find_item) */
  perItem?: boolean;
  /** Whether to show payment safety guidance */
  showSafetyGuidance?: boolean;
};

export const SERVICES: ServiceConfig[] = [
  // ====== FIXED PRICE SERVICES ======
  {
    key: "shop_check",
    label: "Check if Shop is Legit",
    icon: "Search",
    pricingType: "fixed",
    color: "bg-accent/10 text-accent",
    showSafetyGuidance: true,
    locations: [
      { key: "cbd", label: "CBD Flat Rate", price: 150 },
      { key: "outside_cbd", label: "Outside CBD", price: 250 },
    ],
  },
  {
    key: "parcel_pickup",
    label: "CBD Parcel Pickup & Dropoff",
    icon: "Package",
    pricingType: "fixed",
    color: "bg-blue-100 text-blue-600",
    locations: [{ key: "cbd", label: "CBD Flat Rate", price: 100 }],
  },
  {
    key: "parcel_consolidation",
    label: "Parcel Consolidation",
    icon: "Layers",
    pricingType: "fixed",
    color: "bg-purple-100 text-purple-600",
    locations: [{ key: "base", label: "First pickup included", price: 150 }],
    extraPickupCost: 50,
  },

  // ====== TIME-BASED SERVICES ======
  {
    key: "personal_shopping",
    label: "Personal Shopping",
    icon: "ShoppingBag",
    pricingType: "time_based",
    color: "bg-primary/10 text-primary",
    showSafetyGuidance: true,
    urgencyOptions: [
      { key: "express", label: "Express", description: "Within 2 hours", price: 2500 },
      { key: "priority", label: "Priority", description: "Within 4 hours", price: 2000 },
      { key: "same_day", label: "Same Day", description: "Within 8 hours", price: 1200 },
      { key: "flexible", label: "Flexible", description: "Within 24 hours", price: 700 },
    ],
  },
  {
    key: "gift_shopping",
    label: "Gift Shopping",
    icon: "Gift",
    pricingType: "time_based",
    color: "bg-pink-100 text-pink-600",
    showSafetyGuidance: true,
    urgencyOptions: [
      { key: "express", label: "Express", description: "Within 2 hours", price: 600 },
      { key: "priority", label: "Priority", description: "Within 4 hours", price: 450 },
      { key: "same_day", label: "Same Day", description: "Within 8 hours", price: 300 },
      { key: "flexible", label: "Flexible", description: "Within 24 hours", price: 200 },
    ],
  },
  {
    key: "grocery_shopping",
    label: "Grocery Shopping",
    icon: "ShoppingCart",
    pricingType: "time_based",
    color: "bg-green-100 text-green-600",
    showSafetyGuidance: true,
    urgencyOptions: [
      { key: "express", label: "Express", description: "Within 2 hours", price: 1000 },
      { key: "priority", label: "Priority", description: "Within 4 hours", price: 800 },
      { key: "same_day", label: "Same Day", description: "Within 8 hours", price: 650 },
      { key: "flexible", label: "Flexible", description: "Within 24 hours", price: 500 },
    ],
  },
  {
    key: "meal_delivery",
    label: "Meal Pickup & Delivery",
    icon: "UtensilsCrossed",
    pricingType: "time_based",
    color: "bg-red-100 text-red-600",
    urgencyOptions: [
      { key: "express", label: "Express", description: "Within 2 hours", price: 500 },
      { key: "priority", label: "Priority", description: "Within 4 hours", price: 400 },
      { key: "same_day", label: "Same Day", description: "Within 8 hours", price: 300 },
    ],
  },
  {
    key: "bank_run",
    label: "Bank Run",
    icon: "Landmark",
    pricingType: "time_based",
    color: "bg-yellow-100 text-yellow-600",
    urgencyOptions: [
      { key: "express", label: "Express", description: "Within 2 hours", price: 600 },
      { key: "priority", label: "Priority", description: "Within 4 hours", price: 450 },
      { key: "same_day", label: "Same Day", description: "Within 8 hours", price: 300 },
    ],
  },
  {
    key: "govt_office",
    label: "Government Office Run",
    icon: "Building2",
    pricingType: "time_based",
    color: "bg-slate-100 text-slate-600",
    urgencyOptions: [
      { key: "priority", label: "Priority", description: "Within 4 hours", price: 900 },
      { key: "same_day", label: "Same Day", description: "Within 8 hours", price: 600 },
      { key: "next_day", label: "Next Business Day", description: "Next business day", price: 400 },
    ],
  },
  {
    key: "find_item",
    label: "Locate Hard to Find Items",
    icon: "SearchCheck",
    pricingType: "time_based",
    color: "bg-orange-100 text-orange-600",
    perItem: true,
    urgencyOptions: [
      { key: "express", label: "Express", description: "ASAP", price: 300 },
      { key: "same_day", label: "Same Day", description: "Within 8 hours", price: 220 },
      { key: "flexible", label: "Flexible", description: "Within 24 hours", price: 150 },
    ],
  },
  {
    key: "delivery",
    label: "Delivery Services",
    icon: "Truck",
    pricingType: "time_based",
    color: "bg-blue-100 text-blue-600",
    urgencyOptions: [
      { key: "express", label: "Express", description: "Within 2 hours", price: 500 },
      { key: "priority", label: "Priority", description: "Within 4 hours", price: 400 },
      { key: "same_day", label: "Same Day", description: "Within 8 hours", price: 300 },
    ],
  },
];

export function getService(key: ServiceKey): ServiceConfig | undefined {
  return SERVICES.find(s => s.key === key);
}

/** Calculate client-facing totals */
export function calculateClientPricing(serviceAmount: number) {
  const transactionFee = Math.ceil(serviceAmount * CLIENT_FEE_RATE);
  const total = serviceAmount + transactionFee;
  return { serviceAmount, transactionFee, total };
}

/** Calculate runner payout */
export function calculateRunnerPayout(serviceAmount: number) {
  const platformFee = Math.ceil(serviceAmount * RUNNER_FEE_RATE);
  const netPayout = serviceAmount - platformFee;
  return { serviceAmount, platformFee, netPayout };
}

// Payment safety messages
export const PAYMENT_SAFETY_LONG =
  "Pay item money directly to the business or seller through till, paybill, bank transfer, card, or another verified business payment method. Do not send shopping money to a runner's personal number before verification. Need help first? Use Check if Shop is Legit before making payment.";

export const PAYMENT_SAFETY_SHORT =
  "For shopping orders, pay the seller directly after verification. Avoid sending item money to runners. Verify first, then pay.";

export const RUNNER_PAYMENT_RULE =
  "Runners should not request shopping money through personal numbers. Clients should pay verified businesses directly whenever possible.";
