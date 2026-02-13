import { NextResponse } from "next/server";
import { type PosSaleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { requireTerminalSalesPermission } from "@/lib/terminalAuth";

export const POST = async (req: Request) => {
  const auth = await requireTerminalSalesPermission(req);
  if ("error" in auth) {
    return auth.error;
  }
  const { orgId, allowedSaleId } = auth;

  const body = await req.json().catch(() => ({}));
  const saleId = String(body.saleId ?? "").trim();
  if (!saleId) {
    return NextResponse.json({ error: "saleId is required." }, { status: 400 });
  }
  if (allowedSaleId && allowedSaleId !== saleId) {
    return NextResponse.json({ error: "Handoff token does not match this sale." }, { status: 403 });
  }

  const sale = await db.posSale.findFirst({
    where: { id: saleId, orgId },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      total: true,
      reference: true,
      customerName: true,
      customerEmail: true,
    },
  });

  if (!sale) {
    return NextResponse.json({ error: "Sale not found." }, { status: 404 });
  }

  if (sale.status === "paid") {
    return NextResponse.json({ error: "Sale is already paid." }, { status: 400 });
  }

  const amount = Math.round(Number(sale.total) * 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Sale total must be greater than 0." }, { status: 400 });
  }

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "aud",
    payment_method_types: ["card_present"],
    capture_method: "automatic",
    metadata: {
      saleId: sale.id,
      orgId,
      source: "sparkdesk_terminal",
    },
    description: `SparkDesk POS sale ${sale.id} (${sale.customerName})`,
    receipt_email: sale.customerEmail ?? undefined,
  });

  await db.posSale.update({
    where: { id: sale.id },
    data: {
      paymentMethod: "card",
      status: "draft" as PosSaleStatus,
      reference: paymentIntent.id,
    },
  });

  return NextResponse.json({
    saleId: sale.id,
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
  });
};
