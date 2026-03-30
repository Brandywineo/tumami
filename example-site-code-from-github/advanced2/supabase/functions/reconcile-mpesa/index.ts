import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Check admin role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "list_pending";

    if (action === "list_pending") {
      // List payments stuck in initiated/pending for more than 5 minutes
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: pending } = await supabaseAdmin
        .from("mpesa_payment_attempts")
        .select("id, user_id, purpose, amount, total_amount, phone_number, status, checkout_request_id, created_at, errand_id")
        .in("status", ["initiated", "pending"])
        .lt("created_at", fiveMinAgo)
        .order("created_at", { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({ pending: pending || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "timeout_stale") {
      // Mark very old pending payments as timeout
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("mpesa_payment_attempts")
        .update({ status: "timeout", result_desc: "Marked as timeout by admin reconciliation", completed_at: new Date().toISOString() })
        .in("status", ["initiated", "pending"])
        .lt("created_at", thirtyMinAgo)
        .select("id");

      return new Response(JSON.stringify({ timed_out: updated?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "query_status" && body.attempt_id) {
      // Future: query Daraja TransactionStatus API
      // For now, return attempt status
      const { data: attempt } = await supabaseAdmin
        .from("mpesa_payment_attempts")
        .select("*")
        .eq("id", body.attempt_id)
        .single();

      return new Response(JSON.stringify({ attempt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Reconciliation error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
