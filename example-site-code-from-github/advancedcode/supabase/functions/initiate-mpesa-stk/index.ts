import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(phone: string): string | null {
  let p = phone.replace(/[\s\-\(\)]/g, "");
  if (p.startsWith("+254")) p = p.slice(1);
  else if (p.startsWith("0")) p = "254" + p.slice(1);
  else if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  if (!/^254[0-9]{9}$/.test(p)) return null;
  return p;
}

async function getAccessToken(): Promise<string> {
  const key = Deno.env.get("MPESA_CONSUMER_KEY");
  const secret = Deno.env.get("MPESA_CONSUMER_SECRET");
  const env = Deno.env.get("MPESA_ENVIRONMENT") || "sandbox";

  if (!key || !secret) {
    throw new Error("MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is not set");
  }

  const base = env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

  const oauthUrl = `${base}/oauth/v1/generate?grant_type=client_credentials`;
  console.log("OAuth request to:", oauthUrl);
  console.log("Consumer key length:", key.length, "Secret length:", secret.length);

  const resp = await fetch(oauthUrl, {
    method: "GET",
    headers: {
      Authorization: "Basic " + btoa(`${key}:${secret}`),
    },
  });

  const bodyText = await resp.text();
  console.log("OAuth response status:", resp.status);
  console.log("OAuth response body:", bodyText);

  if (!resp.ok) {
    throw new Error(`Daraja OAuth failed (${resp.status}): ${bodyText}`);
  }

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error(`Daraja OAuth returned non-JSON: ${bodyText}`);
  }

  if (!data.access_token) {
    throw new Error("Daraja OAuth response missing access_token: " + bodyText);
  }

  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Secret validation
    const requiredSecrets = ["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_PASSKEY", "MPESA_SHORTCODE", "MPESA_ENVIRONMENT"];
    const missing = requiredSecrets.filter(s => !Deno.env.get(s));
    if (missing.length > 0) {
      console.error("Missing M-Pesa secrets:", missing);
      return new Response(JSON.stringify({
        error: "M-Pesa integration is not configured. Missing secrets: " + missing.join(", "),
        missing_secrets: missing,
        setup_required: true,
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authUser.id;

    const body = await req.json();
    const { purpose, amount, errand_id, phone_number } = body;

    if (!["wallet_topup", "errand_payment"].includes(purpose)) {
      return new Response(JSON.stringify({ error: "Invalid purpose" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = normalizePhone(phone_number || "");
    if (!phone) {
      return new Response(JSON.stringify({ error: "Invalid phone number. Use format 07XXXXXXXX" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payAmount: number;
    let feeAmount = 0;
    let totalAmount: number;
    let errandId: string | null = null;
    let accountRef: string;
    let transactionDesc: string;

    if (purpose === "wallet_topup") {
      payAmount = Number(amount);
      if (!payAmount || payAmount < 1 || payAmount > 150000) {
        return new Response(JSON.stringify({ error: "Amount must be between 1 and 150,000 KES" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      totalAmount = payAmount;
      accountRef = "TumameTopUp";
      transactionDesc = "Tumame Wallet Top Up";
    } else {
      if (!errand_id) {
        return new Response(JSON.stringify({ error: "errand_id required for errand payment" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: errand, error: errandErr } = await supabaseAdmin
        .from("errands").select("*").eq("id", errand_id).single();

      if (errandErr || !errand) {
        return new Response(JSON.stringify({ error: "Errand not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (errand.customer_id !== userId) {
        return new Response(JSON.stringify({ error: "You do not own this errand" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (errand.errand_payment_status === "paid") {
        return new Response(JSON.stringify({ error: "Errand is already paid" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (["completed", "cancelled"].includes(errand.status)) {
        return new Response(JSON.stringify({ error: "Cannot pay for a " + errand.status + " errand" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      errandId = errand.id;
      payAmount = Number(errand.base_amount);
      feeAmount = Number(errand.transaction_fee_amount);
      totalAmount = Number(errand.total_amount);
      accountRef = "TumameErrand";
      transactionDesc = `Errand: ${errand.title?.slice(0, 30) || errand.id.slice(0, 8)}`;
    }

    // Insert attempt record
    const { data: attempt, error: insertErr } = await supabaseAdmin
      .from("mpesa_payment_attempts")
      .insert({
        user_id: userId,
        purpose,
        errand_id: errandId,
        amount: payAmount,
        fee_amount: feeAmount,
        total_amount: totalAmount,
        phone_number: phone,
        account_reference: accountRef,
        transaction_desc: transactionDesc,
        status: "initiated",
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Get Daraja access token (with full logging)
    console.log("Requesting Daraja OAuth token...");
    let accessToken: string;
    try {
      accessToken = await getAccessToken();
      console.log("OAuth token obtained successfully");
    } catch (oauthErr: any) {
      console.error("OAuth token error:", oauthErr.message);
      await supabaseAdmin.from("mpesa_payment_attempts").update({
        status: "failed",
        result_desc: "Daraja authentication failed: " + oauthErr.message,
      }).eq("id", attempt.id);

      return new Response(JSON.stringify({
        error: "M-Pesa authentication failed. Please verify your Daraja API credentials are valid.",
        details: oauthErr.message,
        attempt_id: attempt.id,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const shortcode = Deno.env.get("MPESA_SHORTCODE")!;
    const passkey = Deno.env.get("MPESA_PASSKEY")!;
    const callbackBase = Deno.env.get("MPESA_CALLBACK_BASE_URL") ||
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;
    const env = Deno.env.get("MPESA_ENVIRONMENT") || "sandbox";
    const apiBase = env === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(totalAmount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackBase,
      AccountReference: accountRef,
      TransactionDesc: transactionDesc,
    };

    const stkUrl = `${apiBase}/mpesa/stkpush/v1/processrequest`;
    console.log("Sending STK Push to:", stkUrl);
    console.log("STK Payload:", JSON.stringify(stkPayload));

    const stkResp = await fetch(stkUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkPayload),
    });

    const stkText = await stkResp.text();
    console.log("STK Push response status:", stkResp.status);
    console.log("STK Push response body:", stkText);

    let stkResult;
    try {
      stkResult = JSON.parse(stkText);
    } catch {
      throw new Error(`STK Push returned non-JSON (${stkResp.status}): ${stkText}`);
    }

    // Store raw response
    await supabaseAdmin.from("mpesa_payment_attempts").update({
      raw_request_payload: stkPayload as any,
      raw_response_payload: stkResult as any,
      merchant_request_id: stkResult.MerchantRequestID || null,
      checkout_request_id: stkResult.CheckoutRequestID || null,
      status: stkResult.ResponseCode === "0" ? "pending" : "failed",
      result_desc: stkResult.ResponseCode !== "0" ? (stkResult.ResponseDescription || stkResult.errorMessage || stkText) : null,
    }).eq("id", attempt.id);

    if (stkResult.ResponseCode !== "0") {
      return new Response(JSON.stringify({
        error: stkResult.ResponseDescription || stkResult.errorMessage || "STK Push failed",
        attempt_id: attempt.id,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      attempt_id: attempt.id,
      checkout_request_id: stkResult.CheckoutRequestID,
      message: "STK Push sent. Check your phone.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("STK initiation error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
