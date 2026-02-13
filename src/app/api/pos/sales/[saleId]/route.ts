import { NextResponse } from "next/server";
import { type OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

type Params = { params: Promise<{ saleId: string }> };
type PosSaleStatusValue = "draft" | "paid" | "refunded" | "void";
type SaleRecord = {
  id: string;
  status: PosSaleStatusValue;
  jobId: string | null;
  job?: { id: string; title: string | null } | null;
  paymentMethod: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  reference: string | null;
  notes: string | null;
  subtotal: { toString: () => string };
  gstAmount: { toString: () => string };
  total: { toString: () => string };
  paidAt: Date | null;
  createdAt: Date;
  items: Array<{
    id: string;
    serviceId: string | null;
    name: string;
    quantity: { toString: () => string };
    unitPrice: { toString: () => string };
    lineTotal: { toString: () => string };
  }>;
};
const getSaleId = async (params: Params["params"]) => {
  const resolved = await params;
  return resolved.saleId;
};

const requirePermission = async (permission: "sales:create" | "refunds:manage") => {
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

  if (!membership || !hasPermission(membership.role as OrgRole, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { orgId };
};

export const PATCH = async (req: Request, { params }: Params) => {
  const saleId = await getSaleId(params);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "").trim();

  if (!["mark_paid", "void", "refund"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const permission = action === "mark_paid" ? "sales:create" : "refunds:manage";
  const auth = await requirePermission(permission);
  if ("error" in auth) {
    return auth.error;
  }

  const posSaleModel = (
    db as unknown as {
      posSale?: {
        findFirst: (args: unknown) => Promise<unknown>;
        update: (args: unknown) => Promise<unknown>;
      };
    }
  ).posSale;

  if (!posSaleModel) {
    return NextResponse.json(
      { error: "POS not initialized. Run db migration and restart dev server." },
      { status: 503 }
    );
  }

  let sale: SaleRecord | null = null;
  try {
    const saleResult = await posSaleModel.findFirst({
      where: { id: saleId, orgId: auth.orgId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    sale = saleResult as SaleRecord | null;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      ((error as { code?: string }).code === "P2021" || (error as { code?: string }).code === "P2022")
    ) {
      return NextResponse.json(
        { error: "POS tables missing. Run db migration and restart dev server." },
        { status: 503 }
      );
    }
    throw error;
  }

  if (!sale) {
    return NextResponse.json({ error: "Sale not found." }, { status: 404 });
  }

  let nextStatus: PosSaleStatusValue = sale.status;
  let nextPaidAt: Date | null = sale.paidAt;

  if (action === "mark_paid") {
    if (sale.status !== "draft") {
      return NextResponse.json({ error: "Only draft sales can be marked paid." }, { status: 400 });
    }
    nextStatus = "paid";
    nextPaidAt = new Date();
  }

  if (action === "void") {
    if (sale.status === "void") {
      return NextResponse.json({ error: "Sale is already void." }, { status: 400 });
    }
    if (sale.status === "refunded") {
      return NextResponse.json({ error: "Refunded sales cannot be voided." }, { status: 400 });
    }
    nextStatus = "void";
    nextPaidAt = null;
  }

  if (action === "refund") {
    if (sale.status !== "paid") {
      return NextResponse.json({ error: "Only paid sales can be refunded." }, { status: 400 });
    }
    nextStatus = "refunded";
  }

  let updated: SaleRecord | null = null;
  try {
    const updatedResult = await posSaleModel.update({
      where: { id: sale.id },
      data: {
        status: nextStatus,
        paidAt: nextPaidAt,
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    updated = updatedResult as SaleRecord | null;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      ((error as { code?: string }).code === "P2021" || (error as { code?: string }).code === "P2022")
    ) {
      return NextResponse.json(
        { error: "POS tables missing. Run db migration and restart dev server." },
        { status: 503 }
      );
    }
    throw error;
  }

  if (!updated) {
    return NextResponse.json({ error: "Sale not found." }, { status: 404 });
  }

  const fallbackJobTitle = updated?.jobId
    ? (
        await db.job.findFirst({
          where: { id: updated.jobId, orgId: auth.orgId },
          select: { title: true },
        })
      )?.title ?? null
    : null;

  return NextResponse.json({
    sale: {
      id: updated.id,
      jobId: updated.jobId,
      jobTitle: updated.job?.title ?? fallbackJobTitle,
      status: updated.status,
      paymentMethod: updated.paymentMethod,
      customerName: updated.customerName,
      customerEmail: updated.customerEmail,
      customerPhone: updated.customerPhone,
      reference: updated.reference,
      notes: updated.notes,
      subtotal: Number(updated.subtotal),
      gstAmount: Number(updated.gstAmount),
      total: Number(updated.total),
      paidAt: updated.paidAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      items: updated.items.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    },
  });
};
