/**
 * Stripe billing — client-side port. Creates a subscription Checkout session via
 * the Stripe REST API (secret key bundled for FYP/demo) and confirms it after
 * the user completes payment in the browser. Mirrors the web server functions.
 */
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";

const STRIPE_API = "https://api.stripe.com/v1";

function stripeHeaders() {
  return {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

/** Encode nested params the way Stripe's form API expects (a[b][c]=v). */
function formEncode(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") parts.push(formEncode(v as Record<string, unknown>, key));
    else parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return parts.filter(Boolean).join("&");
}

/**
 * Creates a Stripe Checkout session for the given plan tier.
 * `returnScheme` is the deep link the browser returns to after payment.
 */
export async function createCheckoutSession(tier: string, returnUrl: string): Promise<{ url: string; sessionId: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data: plan, error } = await supabase
    .from("plans")
    .select("tier, name, price_cents")
    .eq("tier", tier)
    .eq("active", true)
    .single();
  if (error || !plan) throw new Error("Plan not found");

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();

  const body = formEncode({
    mode: "subscription",
    customer_email: profile?.email ?? undefined,
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": plan.price_cents,
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": `${plan.name} plan`,
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?canceled=1`,
    "metadata[company_id]": userId,
    "metadata[tier]": tier,
    "subscription_data[metadata][company_id]": userId,
    "subscription_data[metadata][tier]": tier,
  });

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: stripeHeaders(),
    body,
  });
  if (!res.ok) throw new Error(`Stripe error: ${await res.text()}`);
  const session = (await res.json()) as { id: string; url: string };
  return { url: session.url, sessionId: session.id };
}

export async function confirmCheckout(sessionId: string): Promise<{ ok: true; tier: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const res = await fetch(`${STRIPE_API}/checkout/sessions/${sessionId}`, { headers: stripeHeaders() });
  if (!res.ok) throw new Error("Could not retrieve checkout session");
  const session = (await res.json()) as {
    payment_status: string;
    subscription: string | null;
    customer: string | null;
    metadata: { company_id?: string; tier?: string };
  };

  if (session.metadata?.company_id !== userId) throw new Error("Session does not belong to you");
  if (session.payment_status !== "paid") throw new Error("Payment not completed");

  const tier = session.metadata?.tier ?? "basic";
  const { data: cfg } = await supabase
    .from("plans")
    .select("posts_allowed, invitations_allowed")
    .eq("tier", tier)
    .single();

  const { data: upserted, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        company_id: userId,
        tier,
        status: "active",
        posts_allowed: cfg?.posts_allowed ?? 0,
        invitations_allowed: cfg?.invitations_allowed ?? 0,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      },
      { onConflict: "stripe_subscription_id" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Deactivate any other active subscriptions for this company.
  if (upserted?.id) {
    await supabase
      .from("subscriptions")
      .update({ status: "inactive" })
      .eq("company_id", userId)
      .eq("status", "active")
      .neq("id", upserted.id);
  }

  return { ok: true, tier };
}
