import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";

export const POST = async (req: Request) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const saleId = session.metadata?.saleId;
    if (saleId) {
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      await db.posSale.update({
        where: { id: saleId },
        data: {
          status: "paid",
          paidAt: new Date(),
          reference: paymentIntentId ?? session.id,
        },
      });
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await db.org.updateMany({
      where: { stripeAccountId: account.id },
      data: {
        stripeDetailsSubmitted: Boolean(account.details_submitted),
        stripeChargesEnabled: Boolean(account.charges_enabled),
        stripePayoutsEnabled: Boolean(account.payouts_enabled),
      },
    });
  }

  return NextResponse.json({ received: true });
};
