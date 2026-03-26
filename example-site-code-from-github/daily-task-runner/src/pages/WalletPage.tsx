import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import MpesaPayment from "@/components/MpesaPayment";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, X } from "lucide-react";

const transactions = [
  { id: 1, desc: "Errand: Buy groceries", type: "debit", amount: 1200, date: "Today, 2:35 PM", ref: "TUM2X9K1" },
  { id: 2, desc: "Wallet top-up", type: "credit", amount: 3000, date: "Yesterday", ref: "TUM1A8J3" },
  { id: 3, desc: "Errand: Deliver parcel", type: "debit", amount: 800, date: "Mar 22", ref: "TUM0B7H2" },
  { id: 4, desc: "Wallet top-up", type: "credit", amount: 2000, date: "Mar 20", ref: "TUMZ6G4K" },
];

const WalletPage = () => {
  const [showTopup, setShowTopup] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-5 py-4">
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-lg font-bold text-foreground">Wallet</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-6">
        {/* Balance card */}
        <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-elevated">
          <div className="flex items-center gap-2 text-primary-foreground/70">
            <WalletIcon size={18} /> <span className="text-sm font-medium">Available Balance</span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold">KES 3,450</p>
          <div className="mt-5 flex gap-3">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 bg-primary-foreground/15 text-primary-foreground border-0 hover:bg-primary-foreground/25"
              onClick={() => setShowTopup(true)}
            >
              <Plus size={14} /> Top Up
            </Button>
            <Button size="sm" variant="secondary" className="gap-1.5 bg-primary-foreground/15 text-primary-foreground border-0 hover:bg-primary-foreground/25">
              <ArrowUpRight size={14} /> Withdraw
            </Button>
          </div>
        </div>

        {/* Top-up modal */}
        {showTopup && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-md rounded-t-3xl bg-card p-6 shadow-lg animate-slide-up sm:rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-foreground">Top Up Wallet</h2>
                <button onClick={() => setShowTopup(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
              </div>
              <MpesaPayment amount={500} onSuccess={() => setShowTopup(false)} onCancel={() => setShowTopup(false)} />
            </div>
          </div>
        )}

        {/* Transactions */}
        <h2 className="mt-8 font-display text-base font-bold text-foreground">Recent Transactions</h2>
        <div className="mt-3 space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.type === "credit" ? "bg-primary/10" : "bg-muted"}`}>
                {t.type === "credit" ? <ArrowDownLeft size={16} className="text-primary" /> : <ArrowUpRight size={16} className="text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.desc}</p>
                <p className="text-xs text-muted-foreground">{t.date} · {t.ref}</p>
              </div>
              <span className={`font-display text-sm font-bold ${t.type === "credit" ? "text-primary" : "text-foreground"}`}>
                {t.type === "credit" ? "+" : "-"} KES {t.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default WalletPage;
