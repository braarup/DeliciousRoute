import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { normalizeVendorTier } from "@/lib/vendorSubscription";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const vendorId = (session.metadata?.vendorId || "").toString().trim();
      const tier = normalizeVendorTier(
        (session.metadata?.vendorTier || "starter").toString(),
      );

      if (!vendorId) {
        return NextResponse.json({ received: true });
      }

      const providerCustomerId = (session.customer || "").toString() || null;
      const providerSubscriptionId =
        (session.subscription || "").toString() || null;

      await sql`
        UPDATE vendors
        SET
          subscription_tier = ${tier},
          subscription_status = 'active',
          subscription_started_at = COALESCE(subscription_started_at, now()),
          updated_at = now()
        WHERE id = ${vendorId}
      `;

      const billingTableResult = await sql`
        SELECT to_regclass('public.vendor_subscriptions') AS table_name
      `;

      const billingTableExists = !!billingTableResult.rows[0]?.table_name;

      if (billingTableExists) {
        await sql`
          INSERT INTO vendor_subscriptions (
            id,
            vendor_id,
            provider,
            provider_customer_id,
            provider_subscription_id,
            tier,
            status,
            current_period_start,
            metadata,
            updated_at
          )
          VALUES (
            ${randomUUID()},
            ${vendorId},
            'stripe',
            ${providerCustomerId},
            ${providerSubscriptionId},
            ${tier},
            'active',
            now(),
            ${JSON.stringify({
              source: "stripe_webhook_checkout_completed",
              eventId: event.id,
            })}::jsonb,
            now()
          )
          ON CONFLICT (vendor_id)
          DO UPDATE SET
            provider = EXCLUDED.provider,
            provider_customer_id = EXCLUDED.provider_customer_id,
            provider_subscription_id = EXCLUDED.provider_subscription_id,
            tier = EXCLUDED.tier,
            status = EXCLUDED.status,
            current_period_start = EXCLUDED.current_period_start,
            metadata = EXCLUDED.metadata,
            updated_at = now()
        `;

        const subscriptionRow = await sql`
          SELECT id
          FROM vendor_subscriptions
          WHERE vendor_id = ${vendorId}
          LIMIT 1
        `;

        const vendorSubscriptionId = subscriptionRow.rows[0]?.id as
          | string
          | undefined;

        if (vendorSubscriptionId) {
          await sql`
            INSERT INTO vendor_subscription_events (
              id,
              vendor_subscription_id,
              vendor_id,
              provider_event_id,
              event_type,
              payload,
              created_at
            )
            VALUES (
              ${randomUUID()},
              ${vendorSubscriptionId},
              ${vendorId},
              ${event.id},
              ${event.type},
              ${JSON.stringify(session)}::jsonb,
              now()
            )
            ON CONFLICT (provider_event_id) DO NOTHING
          `;
        }
      }

      await sql`
        INSERT INTO vendor_audit_events (id, vendor_id, user_id, event_type, description)
        VALUES (
          ${randomUUID()},
          ${vendorId},
          NULL,
          'subscription_activated',
          ${`Stripe checkout completed; ${tier} tier activated.`}
        )
      `;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error", error);
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
}
