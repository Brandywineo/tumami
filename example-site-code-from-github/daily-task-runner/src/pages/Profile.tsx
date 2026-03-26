import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { User, Phone, Mail, MapPin, Shield, HelpCircle, LogOut, ChevronRight } from "lucide-react";

const profile = {
  name: "James Mwangi",
  phone: "+254 712 345 678",
  email: "james@example.com",
  town: "Thika",
  type: "Customer",
};

const addresses = [
  { label: "Home", value: "Makongeni Estate, Thika" },
  { label: "Office", value: "CBD, Nairobi" },
];

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-5 py-4">
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-lg font-bold text-foreground">Profile</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <span className="font-display text-xl font-bold">JM</span>
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{profile.name}</h2>
            <p className="text-sm text-muted-foreground">{profile.type} · {profile.town}</p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 space-y-1 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <InfoRow icon={Phone} label="Phone" value={profile.phone} />
          <InfoRow icon={Mail} label="Email" value={profile.email} />
          <InfoRow icon={MapPin} label="Town" value={profile.town} />
          <InfoRow icon={Shield} label="Account Type" value={profile.type} />
        </div>

        {/* Addresses */}
        <h3 className="mt-8 font-display text-sm font-bold text-foreground">Saved Addresses</h3>
        <div className="mt-3 space-y-1 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          {addresses.map((a) => (
            <div key={a.label} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.value}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          ))}
        </div>

        {/* Support & Logout */}
        <div className="mt-8 space-y-1 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <button className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground hover:bg-muted transition-colors border-b border-border">
            <HelpCircle size={18} className="text-muted-foreground" /> Support & Help
            <ChevronRight size={16} className="ml-auto text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate("/login")}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut size={18} /> Log out
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
    <Icon size={16} className="text-muted-foreground shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

export default Profile;
