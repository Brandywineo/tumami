import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Wallet, Clock, MapPin, ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const RunnerCTA = () => {
  return (
    <section id="runners" className="py-20 lg:py-28 bg-secondary">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block text-sm font-semibold text-accent uppercase tracking-wider mb-3 px-4 py-1.5 rounded-full bg-accent/10">Earn With Tumame</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-2 mb-4">
              Become a Tumame Runner
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Earn money running errands in your town. Set your own schedule, work when you want, and get paid directly via M-Pesa.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { icon: Wallet, title: "Earn Flexibly", desc: "Get paid per errand completed" },
              { icon: Clock, title: "Your Schedule", desc: "No fixed hours, work anytime" },
              { icon: MapPin, title: "Your Area", desc: "Nairobi, Thika, Ruiru & more" },
              { icon: TrendingUp, title: "Grow Income", desc: "More errands = more earnings" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="p-5 rounded-2xl bg-card border border-border shadow-premium text-center hover:shadow-gold transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-light flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Earnings example */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-gradient-emerald mb-8"
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary-foreground">KES 900</p>
                <p className="text-xs text-primary-foreground/60">Per KES 1,000 errand</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">~30K</p>
                <p className="text-xs text-primary-foreground/60">Avg. monthly earnings</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-foreground">Instant</p>
                <p className="text-xs text-primary-foreground/60">M-Pesa payouts</p>
              </div>
            </div>
          </motion.div>

          <div className="text-center">
            <Button size="lg" className="rounded-xl font-semibold px-10 gap-2 shadow-gold" asChild>
              <Link to="/signup">Apply as a Runner <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RunnerCTA;
