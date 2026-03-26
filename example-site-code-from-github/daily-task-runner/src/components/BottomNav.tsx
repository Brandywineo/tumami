import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Wallet, User } from "lucide-react";

const tabs = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/errands", label: "Errands", icon: ClipboardList },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/profile", label: "Profile", icon: User },
];

const BottomNav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {tabs.map((tab) => {
          const active = pathname === tab.to || (tab.to === "/errands" && pathname.startsWith("/post-errand"));
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
