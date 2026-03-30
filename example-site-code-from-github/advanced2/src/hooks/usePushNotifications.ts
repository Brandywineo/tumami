import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY = "BKfghEnpPeBc76SjTIMNCQ6b6N2ouTOFPtNU5-vh4ghmQTWIf-95kjKq7fe-KEqdKnr9UnAvxkLvrry099DNg4g";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export type PushState = "unsupported" | "default" | "granted" | "denied";

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushState>("default");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushState);

    // Auto-subscribe if already granted and user is logged in
    if (Notification.permission === "granted" && user) {
      registerAndSubscribe(user.id).catch(console.error);
    }
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!user || permission === "unsupported" || permission === "denied") return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushState);
      if (result !== "granted") return false;

      return await registerAndSubscribe(user.id);
    } catch (err) {
      console.error("Push subscription failed:", err);
      return false;
    }
  }, [user, permission]);

  return { permission, subscribe };
}

async function registerAndSubscribe(userId: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisuallyIndicatesUserIsActive: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      } as any);
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      console.error("Push subscription missing required fields");
      return false;
    }

    await supabase.from("push_subscriptions" as any).upsert({
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    } as any, { onConflict: "user_id,endpoint" });

    console.log("Push subscription saved successfully");
    return true;
  } catch (err) {
    console.error("Push registration error:", err);
    return false;
  }
}
