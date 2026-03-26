import { Link } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, CheckCircle2, Clock, Wallet, Plus,
  Package, ShoppingBag, FileText, AlertCircle,
} from "lucide-react";

const statusColors: Record<string, string> = {
  posted: "bg-accent/15 text-accent-foreground border-accent/20",
  accepted: "bg-primary/10 text-primary border-primary/20",
  "in progress": "bg-primary/10 text-primary border-primary/20",
  "awaiting confirmation": "bg-accent/15 text-accent-foreground border-accent/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const stats = [
  { label: "Active", value: "2", icon: ClipboardList, bg: "bg-primary/10 text-primary" },
  { label: "Completed", value: "14", icon: CheckCircle2, bg: "bg-primary/10 text-primary" },
  { label: "Pending", value: "KES 1,200", icon: Clock, bg: "bg-accent/15 text-accent-foreground" },
  { label: "Wallet", value: "KES 3,450", icon: Wallet, bg: "bg-accent/15 text-accent-foreground" },
];

const errands = [
  { id: 1, title: "Buy groceries from Naivas", service: "Shopping", icon: ShoppingBag, status: "in progress", runner: "James O.", amount: 1200, date: "Today, 2:30 PM" },
  { id: 2, title: "Deliver parcel to Kiambu", service: "Delivery", icon: Package, status: "completed", runner: "Wanjiku M.", amount: 800, date: "Yesterday" },
  { id: 3, title: "Pick up documents from Huduma", service: "Document", icon: FileText, status: "posted", runner: null, amount: 500, date: "Today, 4:00 PM" },
  { id: 4, title: "Queue at KRA offices", service: "Queueing", icon: AlertCircle, status: "cancelled", runner: null, amount: 600, date: "2 days ago" },
];

const Dashboard = () => (
  <div className="min-h-screen bg-background pb-20">
    {/* Header */}
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-5 py-4">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Good afternoon 👋</p>
          <h1 className="font-display text-lg font-bold text-foreground">James Mwangi</h1>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <span className="font-display text-sm font-bold">JM</span>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-md px-5 py-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
              <s.icon size={18} />
            </div>
            <p className="mt-2.5 font-display text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Post CTA */}
      <Link
        to="/post-errand"
        className="mt-5 flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-foreground shadow-elevated transition-all hover:opacity-90 active:scale-[0.98]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15">
          <Plus size={20} />
        </div>
        <div>
          <p className="font-display font-bold">Post a new errand</p>
          <p className="text-xs text-primary-foreground/70">Get it done by a trusted runner</p>
        </div>
      </Link>

      {/* Recent */}
      <div className="mt-8">
        <h2 className="font-display text-base font-bold text-foreground">Recent Errands</h2>
        <div className="mt-3 space-y-3">
          {errands.map((e) => (
            <div key={e.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <e.icon size={18} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.service} · {e.date}</p>
                    {e.runner && <p className="mt-0.5 text-xs text-muted-foreground">Runner: {e.runner}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="outline" className={`text-[11px] ${statusColors[e.status] || ""}`}>
                  {e.status}
                </Badge>
                <span className="font-display text-sm font-bold text-foreground">KES {e.amount.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>

    <BottomNav />
  </div>
);

export default Dashboard;
