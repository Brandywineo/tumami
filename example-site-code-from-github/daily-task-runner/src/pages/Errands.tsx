import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import {
  Package, ShoppingBag, FileText, AlertCircle, Plus,
} from "lucide-react";
import { Link } from "react-router-dom";

const statusColors: Record<string, string> = {
  posted: "bg-accent/15 text-accent-foreground border-accent/20",
  accepted: "bg-primary/10 text-primary border-primary/20",
  "in progress": "bg-primary/10 text-primary border-primary/20",
  "awaiting confirmation": "bg-accent/15 text-accent-foreground border-accent/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const stages = ["Posted", "Accepted", "In Progress", "Awaiting Confirmation", "Completed"];

const errands = [
  { id: 1, title: "Buy groceries from Naivas", service: "Shopping", icon: ShoppingBag, status: "in progress", stageIdx: 2, runner: "James O.", amount: 1200, date: "Today, 2:30 PM" },
  { id: 2, title: "Deliver parcel to Kiambu", service: "Delivery", icon: Package, status: "completed", stageIdx: 4, runner: "Wanjiku M.", amount: 800, date: "Yesterday" },
  { id: 3, title: "Pick up documents from Huduma", service: "Document", icon: FileText, status: "posted", stageIdx: 0, runner: null, amount: 500, date: "Today, 4:00 PM" },
  { id: 4, title: "Queue at KRA offices", service: "Queueing", icon: AlertCircle, status: "cancelled", stageIdx: -1, runner: null, amount: 600, date: "2 days ago" },
];

const Errands = () => (
  <div className="min-h-screen bg-background pb-20">
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-5 py-4">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <h1 className="font-display text-lg font-bold text-foreground">My Errands</h1>
        <Link
          to="/post-errand"
          className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.97]"
        >
          <Plus size={16} /> New
        </Link>
      </div>
    </header>

    <main className="mx-auto max-w-md px-5 py-6 space-y-4">
      {errands.map((e) => (
        <div key={e.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <e.icon size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-semibold text-foreground">{e.title}</p>
              <p className="text-xs text-muted-foreground">{e.service} · {e.date}</p>
              {e.runner && <p className="mt-0.5 text-xs text-muted-foreground">Runner: {e.runner}</p>}
            </div>
            <span className="font-display text-sm font-bold text-foreground shrink-0">KES {e.amount.toLocaleString()}</span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline" className={`text-[11px] ${statusColors[e.status] || ""}`}>{e.status}</Badge>
          </div>

          {/* Progress tracker */}
          {e.stageIdx >= 0 && (
            <div className="mt-3 flex gap-1">
              {stages.map((stage, i) => (
                <div key={stage} className="flex-1">
                  <div className={`h-1 rounded-full ${i <= e.stageIdx ? "bg-primary" : "bg-muted"}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </main>

    <BottomNav />
  </div>
);

export default Errands;
