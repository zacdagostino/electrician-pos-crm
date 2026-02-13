import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import PosSalePdf from "@/app/pos/PosSalePdf";

type Params = { params: Promise<{ saleId: string }> };
type SaleRecord = {
  id: string;
  jobId: string | null;
  status: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  subtotal: Prisma.Decimal;
  gstAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  notes: string | null;
  createdAt: Date;
  paidAt: Date | null;
  job?: { id: string; title: string | null } | null;
  items: Array<{
    name: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }>;
};

const getSaleId = async (params: Params["params"]) => {
  const resolved = await params;
  return resolved.saleId;
};

export const GET = async (_req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const membership = await db.orgMember.findFirst({
    where: {
      userId: session.user.id,
      orgId,
      status: "active",
    },
    select: { role: true },
  });

  if (!membership || !hasPermission(membership.role, "sales:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const posSaleModel = (
    db as unknown as {
      posSale?: {
        findFirst: (args: unknown) => Promise<unknown>;
      };
    }
  ).posSale;
  if (!posSaleModel) {
    return NextResponse.json(
      { error: "POS not initialized. Run db migration and restart dev server." },
      { status: 503 }
    );
  }

  const saleId = await getSaleId(params);
  let sale: SaleRecord | null = null;
  try {
    const result = await posSaleModel.findFirst({
      where: { id: saleId, orgId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    sale = result as SaleRecord | null;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return NextResponse.json(
        { error: "POS tables missing. Run db migration and restart dev server." },
        { status: 503 }
      );
    }
    throw error;
  }

  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const org = await db.org.findUnique({ where: { id: orgId } });
  const fallbackJobTitle = sale.jobId
    ? (
        await db.job.findFirst({
          where: { id: sale.jobId, orgId },
          select: { title: true },
        })
      )?.title ?? null
    : null;

  const pdfBuffer = await renderToBuffer(
    PosSalePdf({
      orgName: org?.name ?? "Workspace",
      orgLogoUrl: org?.logoUrl ?? null,
      saleId: sale.id,
      status: sale.status,
      paymentMethod: sale.paymentMethod.replace("_", " "),
      customerName: sale.customerName,
      customerEmail: sale.customerEmail,
      customerPhone: sale.customerPhone,
      jobTitle: sale.job?.title ?? fallbackJobTitle,
      subtotal: Number(sale.subtotal),
      gstAmount: Number(sale.gstAmount),
      total: Number(sale.total),
      notes: sale.notes,
      createdAt: sale.createdAt.toLocaleDateString(),
      paidAt: sale.paidAt ? sale.paidAt.toLocaleDateString() : null,
      items: sale.items.map((item) => ({
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    })
  );

  return new NextResponse(Uint8Array.from(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pos-sale-${sale.id}.pdf"`,
    },
  });
};
