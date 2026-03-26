import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Bike } from "lucide-react";

const roles = [
  {
    id: "customer",
    title: "I need errands done",
    desc: "Post errands and get them handled by trusted local runners.",
    icon: ClipboardList,
    path: "/dashboard",
  },
  {
    id: "runner",
    title: "I want to earn as a runner",
    desc: "Complete errands in your area and earn money with M-Pesa.",
    icon: Bike,
    path: "/runner-verification",
  },
];

const RoleSelect = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    const role = roles.find((r) => r.id === selected);
    if (role) navigate(role.path);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        <div className="mb-10 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <span className="font-display text-lg font-bold text-primary-foreground">T</span>
          </div>
          <span className="font-display text-2xl font-bold text-foreground">Tumame</span>
        </div>

        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center">
            <h1 className="font-display text-xl font-bold text-foreground">How will you use Tumame?</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">You can always change this later.</p>
          </div>

          <div className="mt-8 space-y-3">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelected(role.id)}
                className={`flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                  selected === role.id
                    ? "border-primary bg-primary/5 shadow-elevated"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  selected === role.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <role.icon size={22} />
                </div>
                <div>
                  <p className="font-display font-bold text-foreground">{role.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{role.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleContinue}
            disabled={!selected}
            className={`mt-8 w-full rounded-xl py-3.5 font-display font-bold text-sm transition-all ${
              selected
                ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelect;
