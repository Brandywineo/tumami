import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, url, tag } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("VAPID keys not configured — push notifications disabled");
      return new Response(JSON.stringify({ success: true, sent: 0, message: "VAPID not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body: body || "", url: url || "/", tag: tag || "tumame" });
    let sent = 0;
    const expired: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Build VAPID JWT
        const endpoint = new URL(sub.endpoint);
        const audience = `${endpoint.protocol}//${endpoint.host}`;
        const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

        const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" }))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const claims = btoa(JSON.stringify({ aud: audience, exp, sub: "mailto:hello@tumame.online" }))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

        const unsignedToken = `${header}.${claims}`;

        // Import VAPID private key
        const pubBytes = base64UrlDecode(vapidPublicKey);
        const privBytes = base64UrlDecode(vapidPrivateKey);

        const x = arrayToBase64Url(pubBytes.slice(1, 33));
        const y = arrayToBase64Url(pubBytes.slice(33, 65));
        const d = arrayToBase64Url(privBytes);

        const key = await crypto.subtle.importKey(
          "jwk", { kty: "EC", crv: "P-256", x, y, d },
          { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
        );

        const sig = await crypto.subtle.sign(
          { name: "ECDSA", hash: "SHA-256" }, key,
          new TextEncoder().encode(unsignedToken)
        );

        // Convert DER to raw r||s if needed
        const sigBytes = new Uint8Array(sig);
        let rawSig: Uint8Array;
        if (sigBytes[0] === 0x30) {
          // DER encoded — extract r and s
          const rLen = sigBytes[3];
          const rStart = 4;
          const r = sigBytes.slice(rStart, rStart + rLen);
          const sLenPos = rStart + rLen + 1;
          const sLen = sigBytes[sLenPos];
          const s = sigBytes.slice(sLenPos + 1, sLenPos + 1 + sLen);
          // Pad/trim to 32 bytes each
          rawSig = new Uint8Array(64);
          rawSig.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
          rawSig.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
        } else {
          rawSig = sigBytes;
        }

        const token = `${unsignedToken}.${arrayToBase64Url(rawSig)}`;
        const authorization = `vapid t=${token}, k=${vapidPublicKey}`;

        // Send push — note: without RFC 8291 encryption, only TTL + urgency headers
        // Most push services require encrypted payload, so we send minimal
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            Authorization: authorization,
            TTL: "86400",
            "Content-Length": "0",
            Urgency: "high",
          },
        });

        if (response.ok || response.status === 201) {
          sent++;
        } else if (response.status === 404 || response.status === 410) {
          expired.push(sub.id);
        } else {
          console.error(`Push failed for ${sub.id}: ${response.status} ${await response.text()}`);
        }
      } catch (err) {
        console.error("Push send error:", err);
      }
    }

    if (expired.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expired);
    }

    return new Response(JSON.stringify({ success: true, sent, expired: expired.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Push notification error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function arrayToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
