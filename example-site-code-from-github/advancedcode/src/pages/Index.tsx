import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Services from "@/components/landing/Services";
import HowItWorks from "@/components/landing/HowItWorks";
import Safety from "@/components/landing/Safety";
import ShopCheck from "@/components/landing/ShopCheck";
import Testimonials from "@/components/landing/Testimonials";
import RunnerCTA from "@/components/landing/RunnerCTA";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Services />
      <HowItWorks />
      <Safety />
      <ShopCheck />
      <Testimonials />
      <RunnerCTA />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;
