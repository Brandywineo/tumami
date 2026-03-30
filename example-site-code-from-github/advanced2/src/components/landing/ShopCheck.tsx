import { Search, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ShopCheck = () => {
  return (
    <section className="py-20 lg:py-28 bg-secondary">
      <div className="container">
        <div className="max-w-3xl mx-auto rounded-3xl bg-gradient-emerald p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                <Search className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-accent uppercase tracking-wider">New Service</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Online Shop Checking
            </h2>
            <p className="text-primary-foreground/75 mb-6 max-w-lg leading-relaxed">
              Before you send money to an online seller on Instagram, TikTok, Facebook, or WhatsApp — let us verify them first. We check if the shop is genuine so you don't lose your hard-earned money.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <ShieldCheck className="w-4 h-4 text-accent" /> Seller verification
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <AlertTriangle className="w-4 h-4 text-accent" /> Scam detection
              </div>
            </div>
            <Button size="lg" variant="secondary" className="rounded-xl font-semibold" asChild>
              <Link to="/signup">Check a Shop Now</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShopCheck;
