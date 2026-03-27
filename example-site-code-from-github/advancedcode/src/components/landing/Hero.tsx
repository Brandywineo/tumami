import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Smartphone, CheckCircle, Users, TrendingUp, Search, ShoppingBag, FileText } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-delivery.jpg";

const Hero = () => (
  <section className="relative min-h-[92vh] flex items-center bg-gradient-hero overflow-hidden">
    <div className="absolute inset-0">
      <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-accent/8 blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-primary-foreground/5 blur-3xl" />
    </div>

    <div className="container relative z-10 py-20 lg:py-28">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/15 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium text-primary-foreground/80">Kenya's #1 Errand Platform</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-display font-bold text-primary-foreground leading-[1.1] mb-6">
            Any Errand, Done by<br />
            <span className="text-gradient-gold">Trusted Runners</span>
          </h1>

          <p className="text-lg text-primary-foreground/70 mb-8 max-w-lg leading-relaxed">
            Shopping, deliveries, documents, queueing, online shop verification — post any errand and a verified runner handles it. Pay securely via M-Pesa.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Button size="lg" variant="secondary" className="text-base font-semibold gap-2 rounded-xl h-13 px-8 shadow-gold" asChild>
              <Link to="/signup">Sign Up Free <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base font-semibold gap-2 rounded-xl h-13 px-8 border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
              <Link to="/signup"><Shield className="w-4 h-4" /> Become a Runner</Link>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <Button size="lg" variant="outline" className="text-base font-semibold gap-2 rounded-xl h-13 px-8 border-accent/40 text-accent hover:bg-accent/10 hover:text-accent" asChild>
              <Link to="/signup"><ShoppingBag className="w-4 h-4" /> Become a Merchant</Link>
            </Button>
          </div>
          <p className="text-xs text-primary-foreground/50 -mt-6 mb-6 max-w-md">Sell your products through Tumame and reach more customers with trusted delivery runners.</p>

          <Button variant="ghost" className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5 gap-2 mb-10" asChild>
            <Link to="/signup"><Search className="w-4 h-4" /> Check an Online Shop →</Link>
          </Button>

          <div className="grid grid-cols-3 gap-6 max-w-sm">
            {[{ value: "2,500+", label: "Errands Done" }, { value: "500+", label: "Runners" }, { value: "4.8★", label: "Rating" }].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-primary-foreground">{s.value}</p>
                <p className="text-xs text-primary-foreground/50">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Desktop hero image with floating cards */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative hidden lg:block">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
            <img src={heroImg} alt="Tumame errands — delivery, shopping, documents in Nairobi" width={1280} height={960} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-dark/50 via-transparent to-transparent" />
          </div>

          {/* Floating badge: errand completed */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8, duration: 0.5 }} className="absolute -left-6 bottom-24 p-4 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-premium">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-light flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Errand Completed</p>
                <p className="text-xs text-muted-foreground">Grocery shopping • KES 850</p>
              </div>
            </div>
          </motion.div>

          {/* Floating badge: M-Pesa */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1, duration: 0.5 }} className="absolute -right-4 top-16 p-3 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-premium">
            <div className="flex items-center gap-2">
              <span className="text-lg">💳</span>
              <div>
                <p className="text-xs font-semibold text-foreground">M-Pesa Payment</p>
                <p className="text-xs text-primary font-bold">KES 1,100 ✓</p>
              </div>
            </div>
          </motion.div>

          {/* Floating badge: shop check */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }} className="absolute -right-2 bottom-8 p-3 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-premium">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Search className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Shop Verified</p>
                <p className="text-[10px] text-muted-foreground">Legit seller ✓</p>
              </div>
            </div>
          </motion.div>

          {/* Floating badge: document errand */}
          <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.5 }} className="absolute left-8 top-4 p-2.5 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-premium">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-foreground">Documents picked up</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Mobile hero image */}
      <div className="lg:hidden relative mt-8 rounded-2xl overflow-hidden shadow-premium aspect-[16/9]">
        <img src={heroImg} alt="Tumame errands in Kenya" width={1280} height={960} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 flex gap-2">
          <span className="text-[10px] font-medium text-primary-foreground bg-primary/80 backdrop-blur px-2 py-1 rounded-full">🛒 Shopping</span>
          <span className="text-[10px] font-medium text-primary-foreground bg-primary/80 backdrop-blur px-2 py-1 rounded-full">📦 Delivery</span>
          <span className="text-[10px] font-medium text-primary-foreground bg-primary/80 backdrop-blur px-2 py-1 rounded-full">📄 Documents</span>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 lg:mt-16">
        {[
          { label: "M-Pesa Only", icon: Smartphone },
          { label: "Verified Runners", icon: Shield },
          { label: "Shop Checking", icon: Search },
          { label: "Held Until Done", icon: TrendingUp },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-foreground/8 border border-primary-foreground/10">
            <item.icon className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="text-xs font-medium text-primary-foreground/80">{item.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default Hero;
