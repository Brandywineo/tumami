import { motion } from "framer-motion";
import { Star } from "lucide-react";
import testimonial1 from "@/assets/testimonial-1.jpg";
import testimonial2 from "@/assets/testimonial-2.jpg";
import testimonial3 from "@/assets/testimonial-3.jpg";

const testimonials = [
  {
    name: "Wanjiku Njeri",
    role: "Customer • Nairobi",
    image: testimonial1,
    text: "Tumame saved me so much time! I had groceries delivered from Naivas while I was at work. The runner was so professional and fast.",
    rating: 5,
  },
  {
    name: "Brian Ochieng",
    role: "Runner • Thika",
    image: testimonial2,
    text: "I earn KES 30,000+ monthly running errands on my own schedule. The M-Pesa payouts are instant once a client confirms. Love this platform!",
    rating: 5,
  },
  {
    name: "Amina Wangari",
    role: "Customer • Ruiru",
    image: testimonial3,
    text: "I used the shop checking service before buying from an Instagram seller. Turned out they were legit! Tumame gave me confidence to proceed.",
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block text-sm font-semibold text-accent uppercase tracking-wider mb-3 px-4 py-1.5 rounded-full bg-accent/10">Testimonials</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-2 mb-4">
            Loved by Kenyans
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Hear from customers and runners who use Tumame every day.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="p-6 rounded-2xl bg-card border border-border shadow-premium hover:shadow-gold transition-all"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <img src={t.image} alt={t.name} width={512} height={512} loading="lazy" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
