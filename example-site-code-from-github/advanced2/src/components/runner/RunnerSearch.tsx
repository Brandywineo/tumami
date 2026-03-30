import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Star, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const RunnerSearch = ({ onSelect }: { onSelect?: (runnerId: string) => void }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase.rpc("search_runners", { p_query: query });
      setResults(data || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (runner: any) => {
    if (onSelect) {
      onSelect(runner.user_id);
    } else {
      navigate(`/runner-profile/${runner.user_id}`);
    }
    setQuery("");
    setResults([]);
    setFocused(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search runner by username..." value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 200)}
          className="h-11 rounded-xl pl-10" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
      </div>

      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="absolute z-50 w-full mt-2 bg-card border border-border rounded-2xl shadow-premium overflow-hidden max-h-60 overflow-y-auto">
            {results.map((r) => (
              <button key={r.user_id} onClick={() => handleSelect(r)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">@{r.username} · {r.town}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="w-3 h-3 text-accent fill-accent" />
                  <span className="text-xs font-medium text-foreground">{r.avg_rating}</span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RunnerSearch;
