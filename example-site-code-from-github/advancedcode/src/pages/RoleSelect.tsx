import { useNavigate } from "react-router-dom";
import { ShoppingBag, Bike } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const roles = [
  {
    key: "customer" as const,
    icon: ShoppingBag,
    title: "I Need Errands Done",
    desc: "Request deliveries, shopping, queueing, and more. Pay securely via M-Pesa.",
    href: "/customer",
  },
  {
    key: "runner" as const,
    icon: Bike,
    title: "I Want to Earn as a Runner",
    desc: "Run errands in your town, set your schedule, and get paid via M-Pesa.",
    href: "/runner",
  },
];

const RoleSelect = () => {
  const navigate = useNavigate();
  const { selectRole } = useAuth();

  const handleSelect = async (role: "customer" | "runner", href: string) => {
    await selectRole(role);
    if (role === "runner") {
      navigate("/runner/verification");
    } else {
      navigate(href);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-emerald flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold">T</span>
            </div>
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">How will you use Tumame?</h1>
          <p className="text-muted-foreground text-sm">Choose your role to get started</p>
        </div>

        <div className="space-y-4">
          {roles.map((role, i) => (
            <motion.div
              key={role.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
            >
              <button
                onClick={() => handleSelect(role.key, role.href)}
                className="block w-full text-left p-6 rounded-2xl bg-card border-2 border-border hover:border-primary shadow-premium hover:shadow-gold transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-light flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
                    <role.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">{role.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{role.desc}</p>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoleSelect;
