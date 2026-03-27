import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const FinalCTA = () => {
  return (
    <section className="py-20 lg:py-28 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-10 right-20 w-80 h-80 rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute bottom-10 left-20 w-64 h-64 rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-6 leading-tight">
            Ready to Get Things Done<br /><span className="text-gradient-gold">the Smart Way?</span>
          </h2>
          <p className="text-lg text-primary-foreground/70 mb-8 max-w-lg mx-auto">
            Join thousands of Kenyans who trust Tumame for their daily errands. Start today — it's free to sign up.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-3">
            <Button size="lg" variant="secondary" className="text-base font-semibold gap-2 rounded-xl h-13 px-8 shadow-gold" asChild>
              <Link to="/signup">
                Sign Up Free <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base font-semibold gap-2 rounded-xl h-13 px-8 border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
              <Link to="/signup">
                <Shield className="w-4 h-4" /> Apply as Runner
              </Link>
            </Button>
          </div>
          <div className="flex justify-center">
            <Button size="lg" variant="outline" className="text-base font-semibold gap-2 rounded-xl h-13 px-8 border-accent/30 text-accent hover:bg-accent/10 hover:text-accent" asChild>
              <Link to="/signup">
                <ShoppingBag className="w-4 h-4" /> Become a Merchant
              </Link>
            </Button>
          </div>
          <p className="text-xs text-primary-foreground/40 mt-2">List your products on Tumame and get trusted runners to deliver for you.</p>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
