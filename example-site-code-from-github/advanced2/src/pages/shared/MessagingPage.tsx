import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Image, Loader2, MessageCircle, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const MessagingPage = ({ type = "customer" }: { type?: "customer" | "runner" }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetUserId = searchParams.get("with");

  useEffect(() => {
    if (!user) return;
    loadConversations();

    if (targetUserId) {
      openConversationWith(targetUserId);
    }

    const channel = supabase
      .channel("messaging-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (activeConvo && msg.conversation_id === activeConvo) {
          setMessages(prev => [...prev, msg]);
          if (msg.sender_id !== user.id) {
            supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", msg.id).then(() => {});
          }
        }
        loadConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeConvo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order("last_message_at", { ascending: false });
    
    if (data) {
      const enriched = await Promise.all(data.map(async (c) => {
        const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
        const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", otherId).single();
        const { count } = await supabase.from("messages").select("*", { count: "exact", head: true })
          .eq("conversation_id", c.id).is("read_at", null).neq("sender_id", user.id);
        return { ...c, other_name: profile?.full_name || "User", other_avatar: profile?.avatar_url, other_id: otherId, unread: count || 0 };
      }));
      setConversations(enriched);
    }
    setLoading(false);
  };

  const openConversationWith = async (otherId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc("get_or_create_conversation", {
        p_user_1: user.id, p_user_2: otherId,
      });
      if (error) throw error;
      setActiveConvo(data);
      loadMessages(data);
      loadConversations();
    } catch (err: any) {
      toast.error("Could not open conversation");
    }
  };

  const loadMessages = async (convoId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase.from("messages")
      .select("*").eq("conversation_id", convoId)
      .order("created_at", { ascending: true }).limit(100);
    setMessages(data || []);
    setLoadingMessages(false);

    // Mark unread as read
    if (user) {
      await supabase.from("messages").update({ read_at: new Date().toISOString() })
        .eq("conversation_id", convoId).neq("sender_id", user.id).is("read_at", null);
    }
  };

  const sendMessage = async () => {
    if (!user || !activeConvo || !newMessage.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConvo, sender_id: user.id, content: newMessage.trim(),
      });
      if (error) throw error;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", activeConvo);
      setNewMessage("");
    } catch (err: any) {
      toast.error("Failed to send message");
    } finally { setSending(false); }
  };

  const sendImage = async (file: File) => {
    if (!user || !activeConvo) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Only images are allowed"); return; }

    setSending(true);
    try {
      const path = `chat/${activeConvo}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("uploads").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);

      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConvo, sender_id: user.id, image_url: urlData.publicUrl,
      });
      if (error) throw error;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", activeConvo);
    } catch (err: any) {
      toast.error("Failed to send image");
    } finally { setSending(false); }
  };

  const activeConvoData = conversations.find(c => c.id === activeConvo);

  if (activeConvo) {
    return (
      <AppLayout type={type}>
        <div className="flex flex-col h-[calc(100vh-180px)]">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <button onClick={() => { setActiveConvo(null); setMessages([]); }} className="text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{activeConvoData?.other_name || "Chat"}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {loadingMessages ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">No messages yet. Say hello! 👋</p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      {msg.image_url && (
                        <img src={msg.image_url} alt="Shared" className="rounded-xl max-w-full mb-2 max-h-48 object-cover" />
                      )}
                      {msg.content && <p className="text-sm">{msg.content}</p>}
                      <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = "";
            }} />
            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Image className="w-5 h-5" />
            </button>
            <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              className="h-11 rounded-xl flex-1" />
            <Button size="icon" className="h-11 w-11 rounded-xl" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout type={type}>
      <div className="space-y-5">
        <h1 className="text-xl font-display font-bold text-foreground">Messages</h1>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : conversations.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Start a chat from a runner profile or completed errand.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <button key={c.id} onClick={() => { setActiveConvo(c.id); loadMessages(c.id); }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors text-left">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground truncate">{c.other_name}</p>
                    <span className="text-[10px] text-muted-foreground">{new Date(c.last_message_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {c.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MessagingPage;
