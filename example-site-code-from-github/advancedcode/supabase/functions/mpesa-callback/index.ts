import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Public endpoint — no JWT required
Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  try {
    const body = await req.json();
    console.log("M-Pesa callback received:", JSON.stringify(body));

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      console.error("Invalid callback structure");
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    // Extract receipt number from metadata
    let mpesaReceipt: string | null = null;
    if (CallbackMetadata?.Item) {
      const receiptItem = CallbackMetadata.Item.find(
        (i: any) => i.Name === "MpesaReceiptNumber"
      );
      if (receiptItem) mpesaReceipt = receiptItem.Value;
    }

    // Use service role to call the SECURITY DEFINER function
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabaseAdmin.rpc("process_mpesa_callback", {
      p_checkout_request_id: CheckoutRequestID,
      p_result_code: ResultCode,
      p_result_desc: ResultDesc || "",
      p_mpesa_receipt: mpesaReceipt,
      p_callback_payload: body,
    });

    if (error) {
      console.error("process_mpesa_callback error:", error);
    } else {
      console.log("Callback processed:", data);
    }

    // Always return success to Safaricom
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Callback processing error:", err);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
