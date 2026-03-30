import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  created_at: string;
  related_entity_type: string | null;
}

const AdminNotificationBell = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    const items = (data || []) as AdminNotification[];
    setNotifications(items);
    setUnreadCount(items.filter(n => !n.is_read).length);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("admin-notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("admin_notifications").update({ is_read: true }).in("id", unreadIds);
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
  };

  const typeIcon: Record<string, string> = {
    runner_application: "🏃",
    manual_payment: "💰",
    withdrawal: "💸",
    dispute: "⚠️",
    new_user: "👤",
    system: "🔧",
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left p-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">{typeIcon[n.type] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-medium truncate ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default AdminNotificationBell;
