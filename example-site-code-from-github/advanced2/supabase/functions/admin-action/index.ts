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

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await userClient.auth.getClaims(token);
    if (authError || !claimsData?.claims?.sub) throw new Error("Unauthorized");
    const user = { id: claimsData.claims.sub as string };

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleCheck) throw new Error("Forbidden: not an admin");

    const { action, target_id, reason, amount, description, favor } = await req.json();
    let result: any = { success: true };

    switch (action) {
      case "approve_runner": {
        await adminClient
          .from("runner_verifications")
          .update({ status: "verified", rejection_reason: null, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
          .eq("user_id", target_id);
        await adminClient.rpc("assign_safe_role", { _user_id: target_id, _role: "runner" });

        const { data: runnerProfile } = await adminClient.from("profiles").select("email, full_name").eq("user_id", target_id).single();
        if (runnerProfile?.email) {
          try {
            await adminClient.functions.invoke("send-transactional-email", {
              body: { templateName: "runner-approved", recipientEmail: runnerProfile.email, idempotencyKey: `runner-approved-${target_id}`, templateData: { name: runnerProfile.full_name } },
            });
          } catch { /* non-blocking */ }
        }
        result.message = "Runner approved";
        break;
      }
      case "reject_runner": {
        await adminClient
          .from("runner_verifications")
          .update({ status: "rejected", rejection_reason: reason || "Application rejected", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
          .eq("user_id", target_id);

        const { data: rejRunnerProfile } = await adminClient.from("profiles").select("email, full_name").eq("user_id", target_id).single();
        if (rejRunnerProfile?.email) {
          try {
            await adminClient.functions.invoke("send-transactional-email", {
              body: { templateName: "runner-rejected", recipientEmail: rejRunnerProfile.email, idempotencyKey: `runner-rejected-${target_id}`, templateData: { name: rejRunnerProfile.full_name, reason: reason || "Application rejected" } },
            });
          } catch { /* non-blocking */ }
        }
        result.message = "Runner rejected";
        break;
      }
      case "approve_manual_payment": {
        const { data: rpcResult, error: rpcError } = await adminClient.rpc("approve_manual_payment", {
          p_payment_id: target_id, p_admin_id: user.id, p_admin_note: reason || null,
        });
        if (rpcError) throw rpcError;
        const res = rpcResult as any;
        if (!res?.success) throw new Error(res?.error || "Approval failed");

        if (res.user_id) {
          const { data: userProfile } = await adminClient.from("profiles").select("email, full_name").eq("user_id", res.user_id).single();
          if (userProfile?.email) {
            await adminClient.functions.invoke("send-transactional-email", {
              body: { templateName: "deposit-approved", recipientEmail: userProfile.email, idempotencyKey: `deposit-approved-${target_id}`, templateData: { name: userProfile.full_name, amount: res.amount } },
            });
          }
        }
        result.message = "Manual payment approved and wallet credited";
        break;
      }
      case "reject_manual_payment": {
        const { data: rejResult, error: rejError } = await adminClient.rpc("reject_manual_payment", {
          p_payment_id: target_id, p_admin_id: user.id, p_admin_note: reason || null,
        });
        if (rejError) throw rejError;
        const rejRes = rejResult as any;
        if (!rejRes?.success) throw new Error(rejRes?.error || "Rejection failed");

        const { data: rejPayment } = await adminClient.from("manual_payments").select("user_id, amount").eq("id", target_id).single();
        if (rejPayment) {
          const { data: rejProfile } = await adminClient.from("profiles").select("email, full_name").eq("user_id", rejPayment.user_id).single();
          if (rejProfile?.email) {
            await adminClient.functions.invoke("send-transactional-email", {
              body: { templateName: "deposit-rejected", recipientEmail: rejProfile.email, idempotencyKey: `deposit-rejected-${target_id}`, templateData: { name: rejProfile.full_name, amount: rejPayment.amount, reason: reason || "Payment could not be verified" } },
            });
          }
        }
        result.message = "Manual payment rejected";
        break;
      }
      case "approve_withdrawal": {
        // Determine source table
        const { data: rwCheck } = await adminClient.from("runner_withdrawals").select("id").eq("id", target_id).single();
        const source = rwCheck ? "runner_withdrawals" : "withdrawal_requests";

        // Use the new secure RPC that deducts wallet and marks successful
        const { data: wdResult, error: wdError } = await adminClient.rpc("process_withdrawal_approval", {
          p_withdrawal_id: target_id, p_admin_id: user.id, p_source: source,
        });
        if (wdError) throw wdError;
        const wdRes = wdResult as any;
        if (!wdRes?.success) throw new Error(wdRes?.error || "Withdrawal approval failed");

        // Send email
        const { data: wdInfo } = await adminClient.from(source as any).select("user_id, amount").eq("id", target_id).single();
        if (wdInfo) {
          const { data: wdProfile } = await adminClient.from("profiles").select("email, full_name").eq("user_id", (wdInfo as any).user_id).single();
          if (wdProfile?.email) {
            try {
              await adminClient.functions.invoke("send-transactional-email", {
                body: { templateName: "withdrawal-approved", recipientEmail: wdProfile.email, idempotencyKey: `wd-approved-${target_id}`, templateData: { name: wdProfile.full_name, amount: (wdInfo as any).amount } },
              });
            } catch { /* non-blocking */ }
          }
        }
        result.message = "Withdrawal approved, wallet deducted, status: successful";
        break;
      }
      case "reject_withdrawal": {
        await adminClient
          .from("withdrawal_requests")
          .update({ status: "rejected", admin_note: reason || "", updated_at: new Date().toISOString() })
          .eq("id", target_id);
        await adminClient
          .from("runner_withdrawals")
          .update({ status: "rejected", rejection_reason: reason || "", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
          .eq("id", target_id);

        const { data: rejWdReq } = await adminClient.from("withdrawal_requests").select("user_id, amount").eq("id", target_id).single();
        const rejWdUserId = rejWdReq?.user_id;
        if (!rejWdUserId) {
          const { data: rejRwReq } = await adminClient.from("runner_withdrawals").select("user_id, amount").eq("id", target_id).single();
          if (rejRwReq) {
            const { data: p } = await adminClient.from("profiles").select("email, full_name").eq("user_id", rejRwReq.user_id).single();
            if (p?.email) {
              await adminClient.functions.invoke("send-transactional-email", {
                body: { templateName: "withdrawal-rejected", recipientEmail: p.email, idempotencyKey: `wd-rejected-${target_id}`, templateData: { name: p.full_name, amount: rejRwReq.amount, reason: reason || "" } },
              });
            }
          }
        } else {
          const { data: p } = await adminClient.from("profiles").select("email, full_name").eq("user_id", rejWdUserId).single();
          if (p?.email) {
            await adminClient.functions.invoke("send-transactional-email", {
              body: { templateName: "withdrawal-rejected", recipientEmail: p.email, idempotencyKey: `wd-rejected-${target_id}`, templateData: { name: p.full_name, amount: rejWdReq.amount, reason: reason || "" } },
            });
          }
        }

        await adminClient.from("audit_logs").insert({
          admin_id: user.id, action: "withdrawal_rejected", target_type: "withdrawal", target_id, details: { reason },
        });

        result.message = "Withdrawal rejected";
        break;
      }
      case "resolve_dispute": {
        // Use the new settlement RPC for proper double-entry accounting
        const resolvedFavor = favor || "client";
        const { data: settleResult, error: settleError } = await adminClient.rpc("resolve_dispute_settlement", {
          p_dispute_id: target_id,
          p_admin_id: user.id,
          p_favor: resolvedFavor,
          p_resolution_note: reason || "",
        });
        if (settleError) throw settleError;
        const settleRes = settleResult as any;
        if (!settleRes?.success) throw new Error(settleRes?.error || "Resolution failed");
        result.message = `Dispute resolved in favor of ${resolvedFavor}`;
        break;
      }
      case "reject_dispute": {
        await adminClient
          .from("disputes")
          .update({ status: "rejected", resolution_note: reason || "", resolved_at: new Date().toISOString(), resolved_by: user.id })
          .eq("id", target_id);

        await adminClient.from("audit_logs").insert({
          admin_id: user.id, action: "dispute_rejected", target_type: "dispute", target_id, details: { reason },
        });

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
        const { data: profile } = await adminClient.from("profiles").select("wallet_balance").eq("user_id", target_id).single();
        if (!profile) throw new Error("User not found");
        const newBalance = Number(profile.wallet_balance) + adj;
        if (newBalance < 0) throw new Error("Balance cannot go below zero");
        await adminClient.from("profiles").update({ wallet_balance: newBalance }).eq("user_id", target_id);
        await adminClient.from("wallet_accounts").update({ balance: newBalance }).eq("user_id", target_id);
        const { data: wallet } = await adminClient.from("wallet_accounts").select("id").eq("user_id", target_id).single();
        if (wallet) {
          await adminClient.from("wallet_transactions").insert({
            user_id: target_id, wallet_id: wallet.id, amount: Math.abs(adj), type: "adjustment",
            transaction_type: "adjustment", direction: adj >= 0 ? "credit" : "debit",
            description: description || `Admin balance adjustment: ${adj >= 0 ? "+" : ""}${adj} KES`,
            status: "completed", created_by: user.id,
          });
        }
        result.message = `Balance adjusted by ${adj >= 0 ? "+" : ""}${adj} KES`;
        break;
      }
      default:
        throw new Error("Unknown action: " + action);
    }

    // Audit log for actions not already logged
    if (!["approve_manual", "reject_manual", "resolve_dispute", "reject_dispute", "reject_withdrawal", "adjust_balance"].some(a => action.startsWith(a) || action === a)) {
      await adminClient.from("audit_logs").insert({
        admin_id: user.id, action,
        target_type: action.includes("runner") ? "runner_verification" : action.includes("withdrawal") ? "withdrawal" : "other",
        target_id, details: { reason, amount, description },
      });
    }

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
