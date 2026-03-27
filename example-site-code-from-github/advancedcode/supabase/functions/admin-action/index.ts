import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    if (!authHeader) throw new Error("Missing auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleCheck) throw new Error("Forbidden: not an admin");

    const { action, target_id, reason, amount, description } = await req.json();
    let result: any = { success: true };

    switch (action) {
      case "approve_runner": {
        await adminClient
          .from("runner_verifications")
          .update({ status: "verified", rejection_reason: null, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
          .eq("user_id", target_id);
        result.message = "Runner approved";
        break;
      }
      case "reject_runner": {
        await adminClient
          .from("runner_verifications")
          .update({ status: "rejected", rejection_reason: reason || "Application rejected", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
          .eq("user_id", target_id);
        result.message = "Runner rejected";
        break;
      }
      case "approve_withdrawal": {
        await adminClient
          .from("withdrawal_requests")
          .update({ status: "approved" })
          .eq("id", target_id);
        await adminClient
          .from("runner_withdrawals")
          .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
          .eq("id", target_id);
        result.message = "Withdrawal approved";
        break;
      }
      case "reject_withdrawal": {
        await adminClient
          .from("withdrawal_requests")
          .update({ status: "rejected", admin_note: reason || "" })
          .eq("id", target_id);
        await adminClient
          .from("runner_withdrawals")
          .update({ status: "rejected", rejection_reason: reason || "", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
          .eq("id", target_id);
        result.message = "Withdrawal rejected";
        break;
      }
      case "mark_paid": {
        await adminClient
          .from("withdrawal_requests")
          .update({ status: "paid" })
          .eq("id", target_id);
        await adminClient
          .from("runner_withdrawals")
          .update({ status: "paid", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
          .eq("id", target_id);
        result.message = "Withdrawal marked as paid";
        break;
      }
      case "resolve_dispute": {
        await adminClient
          .from("disputes")
          .update({ status: "resolved", resolution_note: reason || "", resolved_at: new Date().toISOString(), resolved_by: user.id })
          .eq("id", target_id);
        result.message = "Dispute resolved";
        break;
      }
      case "reject_dispute": {
        await adminClient
          .from("disputes")
          .update({ status: "rejected", resolution_note: reason || "", resolved_at: new Date().toISOString(), resolved_by: user.id })
          .eq("id", target_id);
        result.message = "Dispute rejected";
        break;
      }
      case "review_dispute": {
        await adminClient
          .from("disputes")
          .update({ status: "under_review" })
          .eq("id", target_id);
        result.message = "Dispute under review";
        break;
      }
      case "adjust_balance": {
        if (!amount || !target_id) throw new Error("Missing amount or target_id");
        const adj = Number(amount);
        await adminClient
          .from("profiles")
          .update({ wallet_balance: adminClient.rpc ? undefined : undefined })
          .eq("user_id", target_id);
        // Use raw SQL via RPC for safe balance adjustment
        const { data: profile } = await adminClient
          .from("profiles")
          .select("wallet_balance")
          .eq("user_id", target_id)
          .single();
        if (!profile) throw new Error("User not found");
        const newBalance = Number(profile.wallet_balance) + adj;
        if (newBalance < 0) throw new Error("Balance cannot go below zero");
        await adminClient
          .from("profiles")
          .update({ wallet_balance: newBalance })
          .eq("user_id", target_id);
        // Get wallet account for transaction record
        const { data: wallet } = await adminClient
          .from("wallet_accounts")
          .select("id")
          .eq("user_id", target_id)
          .single();
        if (wallet) {
          await adminClient.from("wallet_transactions").insert({
            user_id: target_id,
            wallet_id: wallet.id,
            amount: Math.abs(adj),
            type: "adjustment",
            transaction_type: "adjustment",
            direction: adj >= 0 ? "credit" : "debit",
            description: description || `Admin balance adjustment: ${adj >= 0 ? "+" : ""}${adj} KES`,
            status: "completed",
            created_by: user.id,
          });
        }
        // Record platform earning if it's a fee adjustment
        await adminClient.from("platform_earnings").insert({
          source_type: "adjustment",
          source_reference_id: target_id,
          amount: Math.abs(adj),
          description: description || `Admin adjustment for user`,
        });
        result.message = `Balance adjusted by ${adj >= 0 ? "+" : ""}${adj} KES`;
        break;
      }
      default:
        throw new Error("Unknown action: " + action);
    }

    // Audit log
    await adminClient.from("audit_logs").insert({
      admin_id: user.id,
      action,
      target_type: action.includes("runner") ? "runner_verification" : action.includes("dispute") ? "dispute" : action.includes("withdrawal") || action === "mark_paid" ? "withdrawal" : "balance_adjustment",
      target_id,
      details: { reason, amount, description },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
