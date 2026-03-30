import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour
const CHECK_INTERVAL = 60 * 1000; // check every minute

export const useSessionTimeout = () => {
  const lastActivity = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "pointermove"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));

    timerRef.current = setInterval(async () => {
      if (Date.now() - lastActivity.current > INACTIVITY_LIMIT) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.signOut();
          toast.error("Your session expired. Please log in again.");
          window.location.href = "/login";
        }
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);
};
