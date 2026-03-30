import { ShoppingBag, Truck, FileText, UtensilsCrossed, Search, Clock, Wrench, Package } from "lucide-react";
import { motion } from "framer-motion";
import shoppingImg from "@/assets/service-shopping.jpg";
import deliveryImg from "@/assets/service-delivery.jpg";
import paymentImg from "@/assets/service-payment.jpg";

const services = [
  { icon: ShoppingBag, label: "Shopping", desc: "Groceries, electronics, clothes" },
  { icon: Truck, label: "Delivery", desc: "Parcels & packages across town" },
  { icon: FileText, label: "Documents", desc: "Collect, deliver, or queue" },
  { icon: UtensilsCrossed, label: "Food", desc: "Restaurant & market orders" },
  { icon: Search, label: "Shop Check", desc: "Verify online sellers" },
  { icon: Clock, label: "Queueing", desc: "Huduma, banks, offices" },
  { icon: Wrench, label: "Repairs", desc: "Find & coordinate repairs" },
  { icon: Package, label: "Custom", desc: "Any errand you need" },
];

const showcase = [
  { img: shoppingImg, label: "Shopping Runs", caption: "From Naivas to your doorstep" },
  { img: deliveryImg, label: "Fast Deliveries", caption: "Across Nairobi & beyond" },
  { img: paymentImg, label: "M-Pesa Secure", caption: "Pay only when it's done" },
];

const Services = () => (
  <section id="services" className="py-20 lg:py-28">
    <div className="container">
      <div className="text-center mb-14">
        <span className="text-sm font-semibold text-accent uppercase tracking-wider">Services</span>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3 mb-4">
          Everything You Need, Handled
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          From shopping and deliveries to verifying online sellers — post any errand and let a trusted runner do the rest.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16">
        {services.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="p-4 rounded-2xl bg-card border border-border shadow-premium hover:shadow-gold hover:border-primary/20 transition-all group text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-light flex items-center justify-center mx-auto mb-3 group-hover:bg-primary transition-colors">
              <s.icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-0.5">{s.label}</h3>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {showcase.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="relative rounded-2xl overflow-hidden group"
          >
            <img src={item.img} alt={item.label} loading="lazy" width={640} height={640} className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="font-display font-bold text-primary-foreground text-lg">{item.label}</h3>
              <p className="text-sm text-primary-foreground/70">{item.caption}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Services;
