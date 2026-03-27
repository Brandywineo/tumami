import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "What is Tumame?", a: "Tumame is a Kenyan errand platform where you can request services like deliveries, shopping, queueing, and online shop verification. Trusted runners handle your tasks while you pay securely via M-Pesa." },
  { q: "How do I pay for errands?", a: "All payments are made through M-Pesa only. When you request an errand, you'll receive an M-Pesa STK push to confirm payment. No cash payments are accepted." },
  { q: "Is my money safe?", a: "Yes. Your payment is held in escrow until you confirm the errand is completed. The runner only gets paid after your confirmation." },
  { q: "How much does Tumame charge?", a: "A 10% platform fee is added to the service amount for clients. Runners also pay a 10% fee from their earnings. For example, on a KES 1,000 errand, the client pays KES 1,100 and the runner receives KES 900." },
  { q: "How do runners get verified?", a: "Runners submit their National ID, selfie, phone number, and town. Our team reviews and verifies each application before they can accept errands." },
  { q: "What areas does Tumame cover?", a: "We currently serve Nairobi, Thika, Ruiru, Juja, Kiambu, and surrounding areas. We're expanding to more towns soon." },
  { q: "What is online shop checking?", a: "It's a service where we verify if an online seller on platforms like Instagram, TikTok, Facebook, or WhatsApp is genuine before you send them money." },
  { q: "Can I top up my wallet?", a: "Yes. You can top up your Tumame wallet via M-Pesa. Wallet topups do not incur any platform fee — the full amount is credited to your balance." },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-20 lg:py-28 bg-secondary">
      <div className="container">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3 mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-2xl bg-card px-6 shadow-premium">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
