import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface RatingDialogProps {
  errandId: string;
  runnerId: string;
  clientId: string;
  onClose: () => void;
  onRated?: () => void;
}

const RatingDialog = ({ errandId, runnerId, clientId, onClose, onRated }: RatingDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("runner_ratings").insert({
        errand_id: errandId, client_id: clientId, runner_id: runnerId,
        rating, review: review.trim() || null,
      });
      if (error) {
        if (error.message.includes("duplicate")) {
          toast.error("You already rated this errand");
        } else {
          throw error;
        }
      } else {
        toast.success("Thanks for your rating!");
        onRated?.();
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit rating");
    } finally { setSubmitting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-premium p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Rate Runner</h3>
          <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onMouseEnter={() => setHoveredRating(s)} onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(s)} className="transition-transform hover:scale-110">
              <Star className={`w-8 h-8 ${s <= (hoveredRating || rating) ? "text-accent fill-accent" : "text-muted"}`} />
            </button>
          ))}
        </div>

        <Textarea placeholder="Share your experience (optional)" value={review}
          onChange={(e) => setReview(e.target.value)} className="rounded-xl min-h-[80px]" maxLength={500} />

        <Button className="w-full h-12 rounded-xl font-semibold" onClick={handleSubmit} disabled={submitting || rating === 0}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Rating"}
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default RatingDialog;
