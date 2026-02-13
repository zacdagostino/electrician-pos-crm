import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { requireTerminalSalesPermission } from "@/lib/terminalAuth";

type Params = { params: Promise<{ paymentIntentId: string }> };

export const POST = async (_req: Request, { params }: Params) => {
  const auth = await requireTerminalSalesPermission(_req);
  if ("error" in auth) {
    return auth.error;
  }
  const { orgId, allowedSaleId } = auth;

  const { paymentIntentId } = await params;
  const id = String(paymentIntentId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing payment intent id." }, { status: 400 });
  }

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(id);
  if (paymentIntent.metadata?.orgId !== orgId) {
    return NextResponse.json({ error: "Payment intent does not belong to this org." }, { status: 403 });
  }

  const saleId = paymentIntent.metadata?.saleId;
  if (!saleId) {
    return NextResponse.json({ error: "Payment intent is missing sale metadata." }, { status: 400 });
  }
  if (allowedSaleId && allowedSaleId !== saleId) {
    return NextResponse.json({ error: "Handoff token does not match this sale." }, { status: 403 });
  }

  let finalIntent = paymentIntent;
  if (paymentIntent.status === "requires_capture") {
    finalIntent = await stripe.paymentIntents.capture(paymentIntent.id);
  }

  if (finalIntent.status !== "succeeded") {
    return NextResponse.json(
      { error: `Payment intent status is ${finalIntent.status}.` },
      { status: 400 }
    );
  }

  await db.posSale.updateMany({
    where: { id: saleId, orgId },
    data: {
      status: "paid",
      paymentMethod: "card",
      paidAt: new Date(),
      reference: finalIntent.id,
    },
  });

  return NextResponse.json({ ok: true, saleId, paymentIntentId: finalIntent.id });
};
