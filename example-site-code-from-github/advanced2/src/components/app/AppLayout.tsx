import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Package, Wallet, User, Plus, MessageCircle } from "lucide-react";
import UserNotificationBell from "@/components/app/UserNotificationBell";
import PushNotificationPrompt from "@/components/app/PushNotificationPrompt";

interface AppLayoutProps {
  children: ReactNode;
  type: "customer" | "runner";
}

const AppLayout = ({ children, type }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const leftNav = [
    { href: `/${type}`, icon: Home, label: "Home" },
    { href: `/${type}/errands`, icon: Package, label: "Errands" },
  ];
  const rightNav = [
    { href: `/${type}/messages`, icon: MessageCircle, label: "Chat" },
    { href: `/${type}/wallet`, icon: Wallet, label: "Wallet" },
  ];

  const plusAction = type === "customer" ? "/customer/post-errand" : "/runner/errands";
  const profileActive = location.pathname === `/${type}/profile`;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-emerald flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">T</span>
            </div>
            <span className="font-display text-lg font-bold text-foreground">Tumame</span>
          </Link>
          <div className="flex items-center gap-2">
            <UserNotificationBell />
            <span className="text-xs font-medium text-accent capitalize px-3 py-1 rounded-full bg-accent/10">{type}</span>
            <Link
              to={`/${type}/profile`}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${profileActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              <User className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">{children}</main>

      {/* Bottom nav — 2 left, center plus, 2 right */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border z-50">
        <div className="max-w-lg mx-auto grid grid-cols-5 items-end">
          {leftNav.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href} className={`flex flex-col items-center py-3 gap-1 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Center Plus Button */}
          <div className="flex justify-center -mt-5 pb-1">
            <button
              onClick={() => navigate(plusAction)}
              className="w-14 h-14 rounded-full bg-gradient-emerald shadow-premium flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            >
              <Plus className="w-7 h-7 text-primary-foreground" />
            </button>
          </div>

          {rightNav.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href} className={`flex flex-col items-center py-3 gap-1 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <PushNotificationPrompt />
    </div>
  );
};

export default AppLayout;
