import { NextResponse } from "next/server";
import { type OrgRole, type PosSaleStatus } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getStripeClient } from "@/lib/stripe";

const requireSalesCreatePermission = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: NextResponse.json({ error: "No org selected" }, { status: 400 }) };
  }

  const membership = await db.orgMember.findFirst({
    where: { userId: session.user.id, orgId, status: "active" },
    select: { role: true },
  });

  if (!membership || !hasPermission(membership.role as OrgRole, "sales:create")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { orgId };
};

export const POST = async (req: Request) => {
  const auth = await requireSalesCreatePermission();
  if ("error" in auth) {
    return auth.error;
  }
  const { orgId } = auth;

  const body = await req.json().catch(() => ({}));
  const saleId = String(body.saleId ?? "").trim();
  if (!saleId) {
    return NextResponse.json({ error: "saleId is required." }, { status: 400 });
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
