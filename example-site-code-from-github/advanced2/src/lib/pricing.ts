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
  locations?: LocationOption[];
  extraPickupCost?: number;
  urgencyOptions?: UrgencyOption[];
  perItem?: boolean;
  showSafetyGuidance?: boolean;
  examplePlaceholder?: string;
};

export const SERVICES: ServiceConfig[] = [
  {
    key: "shop_check",
    label: "Check if Shop is Legit",
    icon: "Search",
    pricingType: "fixed",
    color: "bg-accent/10 text-accent",
    showSafetyGuidance: true,
    examplePlaceholder: "e.g. Verify if a phone shop in CBD is genuine before I pay",
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
    examplePlaceholder: "e.g. Pick up parcel from Githurai and deliver to Kasarani",
    locations: [{ key: "cbd", label: "CBD Flat Rate", price: 100 }],
  },
  {
    key: "parcel_consolidation",
    label: "Parcel Consolidation",
    icon: "Layers",
    pricingType: "fixed",
    color: "bg-purple-100 text-purple-600",
    examplePlaceholder: "e.g. Collect 3 parcels from different CBD shops and deliver together",
    locations: [{ key: "base", label: "First pickup included", price: 150 }],
    extraPickupCost: 50,
  },
  {
    key: "personal_shopping",
    label: "Personal Shopping",
    icon: "ShoppingBag",
    pricingType: "time_based",
    color: "bg-primary/10 text-primary",
    showSafetyGuidance: true,
    examplePlaceholder: "e.g. Buy a specific pair of shoes from a store in Westlands Mall",
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
    examplePlaceholder: "e.g. Buy a birthday gift and wrap it nicely, budget KES 3000",
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
    examplePlaceholder: "e.g. Buy 2kg sugar, bread, and milk from Naivas Thika Road",
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
    examplePlaceholder: "e.g. Pick up lunch order from Java House CBD and deliver to my office",
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
    examplePlaceholder: "e.g. Deposit cash at KCB Westlands branch and bring back the slip",
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
    examplePlaceholder: "e.g. Queue at Huduma Centre and submit my KRA PIN application documents",
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
    examplePlaceholder: "e.g. Find a specific phone charger model that's out of stock online",
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
    examplePlaceholder: "e.g. Deliver signed documents from my office to a client in Kilimani",
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
