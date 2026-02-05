import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

type Params = { params: Promise<{ serviceId: string }> };

const getServiceId = async (params: Params["params"]) => {
  const resolved = await params;
  return resolved.serviceId;
};

export const PATCH = async (req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const serviceId = await getServiceId(params);
  const body = await req.json().catch(() => ({}));
  const name = body.name !== undefined ? String(body.name ?? "").trim() : undefined;
  const priceRaw = body.price;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Service name is required." }, { status: 400 });
  }

  const price =
    priceRaw === "" || priceRaw === null || priceRaw === undefined
      ? null
      : Number(priceRaw);
  if (price != null && Number.isNaN(price)) {
    return NextResponse.json({ error: "Invalid price." }, { status: 400 });
  }

  try {
    const service = await db.service.update({
      where: { id: serviceId, orgId },
      data: {
        name,
        price: price !== undefined ? (price != null ? new Prisma.Decimal(price) : null) : undefined,
      },
    });

    return NextResponse.json({
      service: {
        id: service.id,
        name: service.name,
        price: service.price != null ? Number(service.price) : null,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Unable to update service." }, { status: 500 });
  }
};

export const DELETE = async (_req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const serviceId = await getServiceId(params);
  await db.service.delete({ where: { id: serviceId, orgId } });
  return NextResponse.json({ ok: true });
};
