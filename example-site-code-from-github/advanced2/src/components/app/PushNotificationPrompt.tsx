import { useState, useEffect } from "react";
import { Bell, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

const PushNotificationPrompt = () => {
  const { permission, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (permission === "unsupported" || permission === "granted") return;
    if (permission === "denied") return;
    const dismissed = sessionStorage.getItem("push-prompt-dismissed");
    if (dismissed) return;
    // Show after 5 seconds — enough time for page to load but not too aggressive
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, [permission]);

  if (!visible) return null;

  if (permission === "denied") {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-bottom-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Notifications blocked</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You've blocked notifications. To enable them, go to your browser settings and allow notifications for this site.
            </p>
            <Button size="sm" variant="ghost" className="rounded-xl text-xs h-8 mt-2" onClick={() => {
              sessionStorage.setItem("push-prompt-dismissed", "1");
              setVisible(false);
            }}>
              Dismiss
            </Button>
          </div>
          <button onClick={() => { sessionStorage.setItem("push-prompt-dismissed", "1"); setVisible(false); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (permission !== "default") return null;

  const handleEnable = async () => {
    setLoading(true);
    const ok = await subscribe();
    setLoading(false);
    if (ok) {
      toast.success("Push notifications enabled! You'll get alerts even when you're away.");
      setVisible(false);
    } else {
      if (Notification.permission === "denied") {
        toast.error("Notifications blocked. Enable them in your browser settings.");
      } else {
        toast.error("Could not enable notifications. Please try again.");
      }
    }
  };

  const dismiss = () => {
    sessionStorage.setItem("push-prompt-dismissed", "1");
    setVisible(false);
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-bottom-4">
      <div className="p-4 rounded-2xl bg-card border border-border shadow-lg flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Stay updated</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Get notified about errand updates, messages, and payments even when you're away from Tumame.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="rounded-xl text-xs h-8" onClick={handleEnable} disabled={loading}>
              {loading ? "Enabling..." : "Enable Notifications"}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl text-xs h-8" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
