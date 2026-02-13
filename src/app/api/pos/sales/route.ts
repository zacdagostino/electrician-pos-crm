import { NextResponse } from "next/server";
import { PosPaymentMethod, PosSaleStatus, Prisma, type OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission, type Permission } from "@/lib/permissions";

const validPaymentMethods = new Set<PosPaymentMethod>(["card", "cash", "bank_transfer", "other"]);
const validSaleStatuses = new Set<PosSaleStatus>(["draft", "paid"]);

const parseOptionalText = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
};

const isUnknownJobIdArgumentError = (error: unknown) =>
  error instanceof Prisma.PrismaClientValidationError &&
  error.message.includes("Unknown argument `jobId`");

type SaleItemRecord = {
  id: string;
  serviceId: string | null;
  name: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

type SaleRecord = {
  id: string;
  jobId: string | null;
  job?: {
    id: string;
    title: string | null;
  } | null;
  status: PosSaleStatus;
  paymentMethod: PosPaymentMethod;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  reference: string | null;
  notes: string | null;
  subtotal: Prisma.Decimal;
  gstAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  paidAt: Date | null;
  createdAt: Date;
  items: SaleItemRecord[];
};

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

export const GET = async () => {
  const auth = await requireApiPermission("sales:create");
  if ("error" in auth) {
    return auth.error;
  }
  const { orgId } = auth;

  const posSaleModel = (
    db as unknown as {
      posSale?: { findMany: (args: unknown) => Promise<unknown[]> };
    }
  ).posSale;
  if (!posSaleModel) {
    return NextResponse.json(
      { error: "POS not initialized. Run db migration and restart dev server." },
      { status: 503 }
    );
  }

  let sales: SaleRecord[] = [];
  try {
    const result = await posSaleModel.findMany({
      where: { orgId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    sales = result as SaleRecord[];
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

  const jobIds = Array.from(new Set(sales.map((sale) => sale.jobId).filter((id): id is string => Boolean(id))));
  const jobTitleById = new Map<string, string | null>();
  if (jobIds.length) {
    const jobs = await db.job.findMany({
      where: { orgId, id: { in: jobIds } },
      select: { id: true, title: true },
    });
    for (const job of jobs) {
      jobTitleById.set(job.id, job.title ?? null);
    }
  }

  return NextResponse.json({
    sales: sales.map((sale) => ({
      id: sale.id,
      jobId: sale.jobId,
      jobTitle: sale.job?.title ?? (sale.jobId ? jobTitleById.get(sale.jobId) ?? null : null),
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      customerName: sale.customerName,
      customerEmail: sale.customerEmail,
      customerPhone: sale.customerPhone,
      reference: sale.reference,
      notes: sale.notes,
      subtotal: Number(sale.subtotal),
      gstAmount: Number(sale.gstAmount),
      total: Number(sale.total),
      paidAt: sale.paidAt?.toISOString() ?? null,
      createdAt: sale.createdAt.toISOString(),
      items: sale.items.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    })),
  });
};

export const POST = async (req: Request) => {
  const auth = await requireApiPermission("sales:create");
  if ("error" in auth) {
    return auth.error;
  }
  const { orgId, session } = auth;

  const posSaleModel = (
    db as unknown as {
      posSale?: { create: (args: unknown) => Promise<unknown> };
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
  const paymentMethod = String(body.paymentMethod ?? "") as PosPaymentMethod;
  const status = String(body.status ?? "paid") as PosSaleStatus;
  const reference = parseOptionalText(body.reference);
  const notes = parseOptionalText(body.notes);

  if (!customerName) {
    return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
  }

  if (!validPaymentMethods.has(paymentMethod)) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }

  if (!validSaleStatuses.has(status)) {
    return NextResponse.json({ error: "Invalid sale status." }, { status: 400 });
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

  if (customerId) {
    const customer = await db.customer.findFirst({
      where: { id: customerId, orgId },
      select: { id: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Selected customer not found." }, { status: 404 });
    }
  }

  const total = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const org = await db.org.findUnique({
    where: { id: orgId },
    select: { defaultGstRate: true },
  });
  const gstRate = org?.defaultGstRate != null ? Number(org.defaultGstRate) : 0.1;
  const gstAmount = Number((total * (gstRate / (1 + gstRate))).toFixed(2));
  const subtotal = Number((total - gstAmount).toFixed(2));

  try {
    const createData = {
      orgId,
      jobId: linkedJob?.id ?? null,
      customerId: customerId ?? linkedJob?.customerId ?? null,
      createdById: session.user.id,
      status,
      paymentMethod,
      reference,
      notes,
      customerName,
      customerEmail,
      customerPhone,
      subtotal: new Prisma.Decimal(subtotal),
      gstAmount: new Prisma.Decimal(gstAmount),
      total: new Prisma.Decimal(total),
      paidAt: status === "paid" ? new Date() : null,
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

    let created: unknown;
    try {
      created = await posSaleModel.create({
        data: createData,
        include: {
          items: true,
        },
      });
    } catch (error) {
      if (!isUnknownJobIdArgumentError(error)) {
        throw error;
      }
      const createDataWithoutJob = { ...createData };
      delete (createDataWithoutJob as { jobId?: string | null }).jobId;
      created = await posSaleModel.create({
        data: createDataWithoutJob,
        include: {
          items: true,
        },
      });
    }

    const sale = created as SaleRecord;
    const fallbackJobTitle = sale.jobId
      ? (
          await db.job.findFirst({
            where: { id: sale.jobId, orgId },
            select: { title: true },
          })
        )?.title ?? null
      : null;

    return NextResponse.json(
      {
        sale: {
          id: sale.id,
          jobId: sale.jobId,
          jobTitle: sale.job?.title ?? fallbackJobTitle,
          status: sale.status,
          paymentMethod: sale.paymentMethod,
          customerName: sale.customerName,
          customerEmail: sale.customerEmail,
          customerPhone: sale.customerPhone,
          reference: sale.reference,
          notes: sale.notes,
          subtotal: Number(sale.subtotal),
          gstAmount: Number(sale.gstAmount),
          total: Number(sale.total),
          paidAt: sale.paidAt?.toISOString() ?? null,
          createdAt: sale.createdAt.toISOString(),
          items: sale.items.map((item) => ({
            id: item.id,
            serviceId: item.serviceId,
            name: item.name,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.lineTotal),
          })),
        },
      },
      { status: 201 }
    );
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
    return NextResponse.json({ error: "Unable to create sale." }, { status: 500 });
  }
};
