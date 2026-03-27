import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import AppLayout from "@/components/app/AppLayout";

const RunnerPending = () => {
  const navigate = useNavigate();
  return (
    <AppLayout type="runner">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-xl font-display font-bold text-foreground mb-2">Application Under Review</h1>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-8">
          Your runner verification is being reviewed. You'll gain access to the runner dashboard and available errands once approved.
        </p>
        <div className="space-y-3 w-full max-w-xs">
          <Button variant="outline" className="w-full h-12 rounded-xl font-semibold" onClick={() => navigate("/runner/verification")}>
            View Application
          </Button>
          <Button variant="outline" className="w-full h-12 rounded-xl font-semibold" onClick={() => navigate("/customer")}>
            Use as Customer Instead
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-8">
          Need help? <span className="text-primary font-medium">support@tumame.co.ke</span>
        </p>
      </motion.div>
    </AppLayout>
  );
};

export default RunnerPending;
