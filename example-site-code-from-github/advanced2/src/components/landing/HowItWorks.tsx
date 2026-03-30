import { motion } from "framer-motion";
import { ClipboardList, Smartphone, UserCheck, CheckCircle2, Banknote } from "lucide-react";

const steps = [
  { num: "01", icon: ClipboardList, title: "Request a Service", desc: "Tell us what you need — delivery, shopping, queueing, or any custom errand.", accent: false },
  { num: "02", icon: Smartphone, title: "Pay via M-Pesa", desc: "Securely pay through M-Pesa STK push. Funds are held in escrow until completion.", accent: true },
  { num: "03", icon: UserCheck, title: "Runner Assigned", desc: "A verified runner picks up your task and gets to work immediately.", accent: false },
  { num: "04", icon: CheckCircle2, title: "Confirm Completion", desc: "Review the work and confirm when you're satisfied with the errand.", accent: false },
  { num: "05", icon: Banknote, title: "Runner Gets Paid", desc: "After your confirmation, the runner receives their payout via M-Pesa.", accent: true },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-secondary">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block text-sm font-semibold text-accent uppercase tracking-wider mb-3 px-4 py-1.5 rounded-full bg-accent/10">How It Works</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-2 mb-4">
            Simple. Secure. Seamless.
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Getting things done with Tumame takes just a few steps.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-6 bottom-6 w-px bg-border hidden md:block" />

            <div className="space-y-5">
              {steps.map((s, i) => (
                <motion.div
                  key={s.num}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className={`flex gap-5 p-5 md:p-6 rounded-2xl border shadow-premium transition-all hover:shadow-gold ${s.accent ? "bg-gradient-emerald border-primary/20" : "bg-card border-border"}`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${s.accent ? "bg-primary-foreground/15" : "bg-emerald-light"}`}>
                    <s.icon className={`w-5 h-5 ${s.accent ? "text-primary-foreground" : "text-primary"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${s.accent ? "text-accent" : "text-accent"}`}>STEP {s.num}</span>
                    </div>
                    <h3 className={`font-semibold mb-1 ${s.accent ? "text-primary-foreground" : "text-foreground"}`}>{s.title}</h3>
                    <p className={`text-sm leading-relaxed ${s.accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
