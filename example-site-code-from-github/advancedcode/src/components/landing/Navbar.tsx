import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Services", href: "#services" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Become a Runner", href: "#runners" },
  { label: "Safety", href: "#safety" },
  { label: "FAQ", href: "#faq" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-emerald flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">T</span>
          </div>
          <span className="font-display text-xl font-bold text-foreground">Tumame</span>
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Button variant="ghost" asChild><Link to="/login">Login</Link></Button>
          <Button className="rounded-xl font-semibold px-6 shadow-gold" asChild><Link to="/signup">Sign Up Free</Link></Button>
        </div>

        <button className="lg:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background p-4 space-y-3 animate-fade-in">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              {l.label}
            </a>
          ))}
          <div className="flex gap-3 pt-3 border-t border-border">
            <Button variant="ghost" className="flex-1" asChild><Link to="/login">Login</Link></Button>
            <Button className="flex-1 rounded-xl font-semibold shadow-gold" asChild><Link to="/signup">Sign Up Free</Link></Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
