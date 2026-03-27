import { Shield, Lock, Eye, Users } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Lock, title: "Escrow Payments", desc: "Your money is held securely until you confirm the errand is complete. No early payouts.", highlight: true },
  { icon: Shield, title: "Verified Runners", desc: "Every runner is verified with ID, selfie, and background info before accepting errands." },
  { icon: Eye, title: "Full Transparency", desc: "Track your errand in real-time. See status updates at every step of the process." },
  { icon: Users, title: "Kenya-Based Support", desc: "Our support team is local. Reach us anytime for help, questions, or disputes." },
];

const Safety = () => {
  return (
    <section id="safety" className="py-20 lg:py-28 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block text-sm font-semibold text-accent uppercase tracking-wider mb-3 px-4 py-1.5 rounded-full bg-accent/10">Your Safety</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-2 mb-4">
            Your Money is Safe With Us
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            We hold payments in escrow until you're satisfied. No runner gets paid until you confirm task completion.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`p-6 rounded-2xl border shadow-premium hover:shadow-gold transition-all ${f.highlight ? "bg-gradient-emerald border-primary/20" : "bg-card border-border"}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.highlight ? "bg-primary-foreground/15" : "bg-emerald-light"}`}>
                <f.icon className={`w-5 h-5 ${f.highlight ? "text-primary-foreground" : "text-primary"}`} />
              </div>
              <h3 className={`font-semibold mb-2 ${f.highlight ? "text-primary-foreground" : "text-foreground"}`}>{f.title}</h3>
              <p className={`text-sm leading-relaxed ${f.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Safety;
