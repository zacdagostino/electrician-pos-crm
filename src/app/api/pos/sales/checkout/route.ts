import { NextResponse } from "next/server";
import { PosPaymentMethod, PosSaleStatus, Prisma, type OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission, type Permission } from "@/lib/permissions";
import { getStripeClient } from "@/lib/stripe";

const validPaymentMethods = new Set<PosPaymentMethod>(["card", "cash", "bank_transfer", "other"]);
const parseOptionalText = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
};

const isUnknownJobIdArgumentError = (error: unknown) =>
  error instanceof Prisma.PrismaClientValidationError &&
  error.message.includes("Unknown argument `jobId`");

const requireApiPermission = async (permission: Permission) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: NextResponse.json({ error: "No org selected" }, { status: 400 }) };
  }

  const membership = await db.orgMember.findFirst({
    where: {
      userId: session.user.id,
      orgId,
      status: "active",
    },
    select: { role: true },
  });

  if (!membership || !hasPermission(membership.role as OrgRole, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session, orgId };
};

export const POST = async (req: Request) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET." },
      { status: 503 }
    );
  }

  const auth = await requireApiPermission("sales:create");
  if ("error" in auth) {
    return auth.error;
  }
  const { orgId, session } = auth;

  const posSaleModel = (
    db as unknown as {
      posSale?: {
        create: (args: unknown) => Promise<unknown>;
        update?: (args: unknown) => Promise<unknown>;
      };
    }
  ).posSale;
  if (!posSaleModel) {
    return NextResponse.json(
      { error: "POS not initialized. Run db migration and restart dev server." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const jobId = parseOptionalText(body.jobId);
  const customerId = parseOptionalText(body.customerId);
  const customerName = String(body.customerName ?? "").trim();
  const customerEmail = parseOptionalText(body.customerEmail);
  const customerPhone = parseOptionalText(body.customerPhone);
  const paymentMethod = String(body.paymentMethod ?? "card") as PosPaymentMethod;
  const notes = parseOptionalText(body.notes);

  if (!customerName) {
    return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
  }
  if (!validPaymentMethods.has(paymentMethod)) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }
  if (paymentMethod !== "card") {
    return NextResponse.json({ error: "Stripe checkout is only available for card payments." }, { status: 400 });
  }

  let linkedJob:
    | {
        id: string;
        customerId: string;
      }
    | null = null;
  if (jobId) {
    linkedJob = await db.job.findFirst({
      where: { id: jobId, orgId },
      select: { id: true, customerId: true },
    });
    if (!linkedJob) {
      return NextResponse.json({ error: "Selected job not found." }, { status: 404 });
    }
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (!rawItems.length) {
    return NextResponse.json({ error: "At least one line item is required." }, { status: 400 });
  }

  const items: Array<{
    serviceId: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }> = [];

  for (const rawItem of rawItems) {
    const name = String(rawItem?.name ?? "").trim();
    const quantity = Number(rawItem?.quantity ?? 0);
    const unitPrice = Number(rawItem?.unitPrice ?? 0);
    const serviceId = parseOptionalText(rawItem?.serviceId);
    if (!name) {
      return NextResponse.json({ error: "Each item must include a name." }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Each item quantity must be greater than 0." }, { status: 400 });
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json({ error: "Each item unit price must be 0 or greater." }, { status: 400 });
    }
    const lineTotal = Number((quantity * unitPrice).toFixed(2));
    items.push({ serviceId, name, quantity, unitPrice, lineTotal });
  }

  const total = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const org = await db.org.findUnique({
    where: { id: orgId },
    select: { defaultGstRate: true },
  });
  const gstRate = org?.defaultGstRate != null ? Number(org.defaultGstRate) : 0.1;
  const gstAmount = Number((total * (gstRate / (1 + gstRate))).toFixed(2));
  const subtotal = Number((total - gstAmount).toFixed(2));

  const createData = {
    orgId,
    jobId: linkedJob?.id ?? null,
    customerId: customerId ?? linkedJob?.customerId ?? null,
    createdById: session.user.id,
    status: "draft" as PosSaleStatus,
    paymentMethod,
    reference: null,
    notes,
    customerName,
    customerEmail,
    customerPhone,
    subtotal: new Prisma.Decimal(subtotal),
    gstAmount: new Prisma.Decimal(gstAmount),
    total: new Prisma.Decimal(total),
    paidAt: null,
    items: {
      create: items.map((item) => ({
        serviceId: item.serviceId,
        name: item.name,
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(item.unitPrice),
        lineTotal: new Prisma.Decimal(item.lineTotal),
      })),
    },
  };

  let sale: { id: string } | null = null;
  try {
    const created = await posSaleModel.create({
      data: createData,
      select: { id: true },
    });
    sale = created as { id: string };
  } catch (error) {
    if (isUnknownJobIdArgumentError(error)) {
      const createDataWithoutJob = { ...createData };
      delete (createDataWithoutJob as { jobId?: string | null }).jobId;
      const created = await posSaleModel.create({
        data: createDataWithoutJob,
        select: { id: true },
      });
      sale = created as { id: string };
    } else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return NextResponse.json(
        { error: "POS tables missing. Run db migration and restart dev server." },
        { status: 503 }
      );
    } else {
      throw error;
    }
  }

  if (!sale) {
    return NextResponse.json({ error: "Unable to create checkout sale." }, { status: 500 });
  }

  const stripe = getStripeClient();
  const origin = new URL(req.url).origin;
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${origin}/pos?checkout=success`,
    cancel_url: `${origin}/pos?checkout=cancelled`,
    customer_email: customerEmail ?? undefined,
    metadata: {
      saleId: sale.id,
      orgId,
    },
    line_items: items.map((item) => ({
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: Math.round(item.lineTotal * 100),
        product_data: {
          name: item.name,
          description: `${item.quantity} x $${item.unitPrice.toFixed(2)}`,
        },
      },
    })),
  });

  if (posSaleModel.update) {
    await posSaleModel.update({
      where: { id: sale.id },
      data: {
        reference: checkout.id,
      },
    });
  }

  return NextResponse.json({
    saleId: sale.id,
    checkoutUrl: checkout.url,
  });
};
