import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-14 bg-foreground">
      <div className="container">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-emerald flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-sm">T</span>
              </div>
              <span className="font-display text-xl font-bold text-background">Tumame</span>
            </div>
            <p className="text-sm text-background/50 leading-relaxed mb-4">
              Kenya's trusted errand platform. Get things done the smart way with verified runners and M-Pesa payments.
            </p>
            <div className="flex gap-3">
              {["Twitter", "Instagram", "WhatsApp"].map(s => (
                <a key={s} href="#" className="w-9 h-9 rounded-lg bg-background/8 flex items-center justify-center text-xs font-medium text-background/60 hover:bg-background/15 hover:text-background transition-colors">
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-background mb-4 text-sm">Platform</h4>
            <div className="space-y-2.5">
              <a href="#services" className="block text-sm text-background/50 hover:text-background transition-colors">Services</a>
              <a href="#how-it-works" className="block text-sm text-background/50 hover:text-background transition-colors">How it Works</a>
              <a href="#safety" className="block text-sm text-background/50 hover:text-background transition-colors">Safety</a>
              <a href="#faq" className="block text-sm text-background/50 hover:text-background transition-colors">FAQ</a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-background mb-4 text-sm">Company</h4>
            <div className="space-y-2.5">
              <a href="#" className="block text-sm text-background/50 hover:text-background transition-colors">About Us</a>
              <a href="#" className="block text-sm text-background/50 hover:text-background transition-colors">Terms of Service</a>
              <a href="#" className="block text-sm text-background/50 hover:text-background transition-colors">Privacy Policy</a>
              <a href="#" className="block text-sm text-background/50 hover:text-background transition-colors">Contact</a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-background mb-4 text-sm">Get Started</h4>
            <div className="space-y-2.5">
              <Link to="/signup" className="block text-sm text-background/50 hover:text-background transition-colors">Sign Up</Link>
              <Link to="/login" className="block text-sm text-background/50 hover:text-background transition-colors">Login</Link>
              <Link to="/signup" className="block text-sm text-background/50 hover:text-background transition-colors">Become a Runner</Link>
              <a href="mailto:support@tumame.co.ke" className="block text-sm text-background/50 hover:text-background transition-colors">support@tumame.co.ke</a>
            </div>
          </div>
        </div>

        <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-background/30">© 2026 Tumame. All rights reserved.</p>
          <p className="text-xs text-background/30">Made with ❤️ in Kenya 🇰🇪</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
