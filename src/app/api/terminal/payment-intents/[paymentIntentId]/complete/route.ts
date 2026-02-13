import { NextResponse } from "next/server";
import type { OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getStripeClient } from "@/lib/stripe";

type Params = { params: Promise<{ paymentIntentId: string }> };

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

export const POST = async (_req: Request, { params }: Params) => {
  const auth = await requireSalesCreatePermission();
  if ("error" in auth) {
    return auth.error;
  }
  const { orgId } = auth;

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
