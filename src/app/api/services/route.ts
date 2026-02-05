import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

export const GET = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  let services = await db.service.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
  });

  if (!services.length) {
    const profile = await db.pricingProfile.findFirst({
      where: { orgId },
      include: {
        categories: {
          include: { items: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (profile) {
      const items = profile.categories.flatMap((category) => category.items);
      if (items.length) {
        await db.service.createMany({
          data: items.map((item) => ({
            orgId,
            name: item.name,
            price: item.price,
          })),
          skipDuplicates: true,
        });
        services = await db.service.findMany({
          where: { orgId },
          orderBy: { createdAt: "asc" },
        });
      }
    }
  }

  return NextResponse.json({
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price != null ? Number(service.price) : null,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    })),
  });
};

export const POST = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const priceRaw = body.price;

  if (!name) {
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
    const service = await db.service.create({
      data: {
        orgId,
        name,
        price: price != null ? new Prisma.Decimal(price) : null,
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
    return NextResponse.json({ error: "Unable to create service." }, { status: 500 });
  }
};
