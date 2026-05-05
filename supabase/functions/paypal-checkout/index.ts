import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET");
// Use sandbox by default; set PAYPAL_MODE=live for production
const PAYPAL_BASE =
  Deno.env.get("PAYPAL_MODE") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const secret = PAYPAL_SECRET ?? "";
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, invoiceId, orderId } = await req.json();

    // Authenticate user
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "create") {
      // Fetch invoice & verify ownership
      const { data: invoice, error: invErr } = await adminClient
        .from("invoices")
        .select("id, amount, business_id, status")
        .eq("id", invoiceId)
        .single();
      if (invErr || !invoice) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Verify the user owns the business
      const { data: biz } = await adminClient
        .from("businesses")
        .select("owner_id")
        .eq("id", invoice.business_id)
        .single();
      if (!biz || biz.owner_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (invoice.status === "paid") {
        return new Response(JSON.stringify({ error: "Invoice already paid" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await getAccessToken();
      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: invoiceId,
              description: `TradeConnect Subscription Invoice`,
              amount: {
                currency_code: "USD",
                value: Number(invoice.amount).toFixed(2),
              },
            },
          ],
        }),
      });
      if (!orderRes.ok) throw new Error(`PayPal create order failed: ${await orderRes.text()}`);
      const order = await orderRes.json();

      return new Response(JSON.stringify({ orderId: order.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "capture") {
      const token = await getAccessToken();
      const captureRes = await fetch(
        `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!captureRes.ok) throw new Error(`PayPal capture failed: ${await captureRes.text()}`);
      const captureData = await captureRes.json();

      if (captureData.status === "COMPLETED") {
        // Use ONLY PayPal-verified reference_id - never trust client-supplied invoiceId
        const refId = captureData.purchase_units?.[0]?.reference_id;
        if (refId) {
          // Re-verify the authenticated user owns the business linked to this invoice
          const { data: invoice } = await adminClient
            .from("invoices")
            .select("id, business_id, status")
            .eq("id", refId)
            .single();
          if (invoice) {
            const { data: biz } = await adminClient
              .from("businesses")
              .select("owner_id")
              .eq("id", invoice.business_id)
              .single();
            if (biz && biz.owner_id === user.id && invoice.status !== "paid") {
              await adminClient
                .from("invoices")
                .update({ status: "paid", paid_at: new Date().toISOString() })
                .eq("id", refId);
            }
          }
        }
      }

      return new Response(JSON.stringify({ status: captureData.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return client ID for SDK loading
    if (action === "get-client-id") {
      return new Response(JSON.stringify({ clientId: PAYPAL_CLIENT_ID }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
