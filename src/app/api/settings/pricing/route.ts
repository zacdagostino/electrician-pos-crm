import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

const seedPricingProfile = async (orgId: string) => {
  return db.pricingProfile.create({
    data: {
      orgId,
      name: "WA Standard",
      region: "WA",
      serviceAreaKm: 20,
      travelSurchargeEnabled: true,
      travelSurchargeAmount: new Prisma.Decimal(300),
      minimumCharge: new Prisma.Decimal(300),
      calloutFirstHour: new Prisma.Decimal(140),
      hourlyRate: new Prisma.Decimal(140),
      intervalMinutes: 15,
      intervalRate: new Prisma.Decimal(35),
      afterHoursMultiplier: new Prisma.Decimal(1.5),
      gstRate: new Prisma.Decimal(0.1),
      pricesIncludeGst: true,
      complianceText:
        "Fully licensed and insured electrician operating in Western Australia. All work completed in accordance with AS/NZS 3000 (Wiring Rules) and WA Electrical Requirements. Electrical Safety Certificates provided where required. Warranty responsibility remains with the electrician after work is completed.",
      comparisonText:
        "Cheaper prices often mean reduced testing or rushed workmanship. Compliance, insurance, and legal responsibility apply regardless of job size. Not all quotes include full testing, certification, or warranty cover.",
      customerSummary:
        "Our pricing reflects licensed, compliant electrical work completed safely, professionally, and to WA standards — not rushed or cut‑price installations.",
      customerExplanation:
        "Minimum charge ensures every job receives full professional care, including travel time, setup, testing, and compliance checks. Clear, upfront pricing — no hidden costs.",
      categories: {
        create: [
          {
            name: "Power Outlets",
            sortOrder: 1,
            items: {
              create: [
                { type: "fixed", name: "Install SGPO (single outlet)", price: 300, sortOrder: 1 },
                { type: "fixed", name: "Install DGPO (double outlet)", price: 350, sortOrder: 2 },
                { type: "fixed", name: "Install QGPO (quad outlet)", price: 380, sortOrder: 3 },
                { type: "fixed", name: "Install WPGPO (weatherproof)", price: 380, sortOrder: 4 },
                { type: "fixed", name: "Replace existing GPO", price: 90, sortOrder: 5 },
                { type: "addon", name: "Replace additional GPO (like-for-like)", price: 80, sortOrder: 6 },
                { type: "addon", name: "Add extra DGPO (short run)", price: 180, sortOrder: 7 },
                { type: "addon", name: "Add extra DGPO (longer run)", price: 220, sortOrder: 8 },
                { type: "addon", name: "Upgrade SGPO → DGPO", price: 120, sortOrder: 9 },
                { type: "addon", name: "Weatherproof GPO upgrade", price: 150, sortOrder: 10 },
              ],
            },
          },
          {
            name: "RCDs & Smoke Alarms",
            sortOrder: 2,
            items: {
              create: [
                { type: "fixed", name: "Supply & install 240V smoke alarm", price: 320, sortOrder: 1 },
                { type: "fixed", name: "Replace smoke alarm (like-for-like)", price: 200, sortOrder: 2 },
                { type: "fixed", name: "Supply & install RCD/RCBO", price: 350, sortOrder: 3 },
                { type: "fixed", name: "Replace RCD while onsite", price: 170, sortOrder: 4 },
                { type: "addon", name: "Add smoke alarm (additional)", price: 280, sortOrder: 5 },
                { type: "addon", name: "Replace smoke alarm (additional)", price: 150, sortOrder: 6 },
                { type: "addon", name: "Add RCBO/RCD (space available)", price: 320, sortOrder: 7 },
                { type: "addon", name: "Replace RCD while onsite (add-on)", price: 150, sortOrder: 8 },
              ],
            },
          },
          {
            name: "Lighting & Fans",
            sortOrder: 3,
            items: {
              create: [
                { type: "fixed", name: "Install ceiling fan (existing wiring/support)", price: 350, sortOrder: 1 },
                { type: "fixed", name: "Install ceiling fan (new wiring/support)", price: 420, sortOrder: 2 },
                { type: "fixed", name: "Install LED downlight (each)", price: 80, sortOrder: 3 },
                { type: "fixed", name: "Install exhaust fan (each)", price: 320, sortOrder: 4 },
                { type: "fixed", name: "Replace exhaust fan (like-for-like)", price: 220, sortOrder: 5 },
                { type: "fixed", name: "Replace light fitting (like-for-like)", price: 90, sortOrder: 6 },
                { type: "fixed", name: "Install data point (Cat6)", price: 320, sortOrder: 7 },
                { type: "fixed", name: "Install TV antenna point", price: 320, sortOrder: 8 },
                { type: "addon", name: "Replace light fitting (additional)", price: 80, sortOrder: 9 },
                { type: "addon", name: "Add LED downlight (additional)", price: 70, sortOrder: 10 },
                { type: "addon", name: "Add LED downlight (bulk 3+)", price: 60, sortOrder: 11 },
                { type: "addon", name: "Replace batten holder with LED oyster", price: 120, sortOrder: 12 },
                { type: "addon", name: "Replace ceiling fan (existing wiring/support)", price: 300, sortOrder: 13 },
                { type: "addon", name: "Add second fan same visit", price: 280, sortOrder: 14 },
                { type: "addon", name: "Replace exhaust fan (like-for-like)", price: 180, sortOrder: 15 },
                { type: "addon", name: "Upgrade exhaust to higher-capacity unit", price: 220, sortOrder: 16 },
              ],
            },
          },
          {
            name: "Switching",
            sortOrder: 4,
            items: {
              create: [
                { type: "fixed", name: "Install new light switch (existing wiring nearby)", price: 300, sortOrder: 1 },
                { type: "fixed", name: "Install additional switch point (same visit)", price: 180, sortOrder: 2 },
                { type: "fixed", name: "Convert switch to 2-way", price: 380, sortOrder: 3 },
                { type: "fixed", name: "Convert switch to 3-way intermediate", price: 450, sortOrder: 4 },
                { type: "fixed", name: "Replace existing switch (like-for-like)", price: 90, sortOrder: 5 },
                { type: "addon", name: "Replace additional switch (like-for-like)", price: 70, sortOrder: 6 },
                { type: "addon", name: "Add extra switch point (same wall/cavity)", price: 150, sortOrder: 7 },
                { type: "addon", name: "Convert to 2-way switching (add-on)", price: 300, sortOrder: 8 },
                { type: "addon", name: "Add intermediate (3-way)", price: 380, sortOrder: 9 },
                { type: "addon", name: "Replace switch mech while onsite", price: 70, sortOrder: 10 },
              ],
            },
          },
          {
            name: "Switchboards",
            sortOrder: 5,
            items: {
              create: [
                { type: "fixed", name: "Basic switchboard upgrade (house)", price: 2200, sortOrder: 1 },
                { type: "fixed", name: "Medium switchboard upgrade", price: 2500, sortOrder: 2 },
                { type: "fixed", name: "Large/complex switchboard upgrade", price: 3000, sortOrder: 3 },
              ],
            },
          },
          {
            name: "Appliances",
            sortOrder: 6,
            items: {
              create: [
                { type: "fixed", name: "Disconnect & reconnect oven/cooktop", price: 320, sortOrder: 1 },
                { type: "fixed", name: "Remove & dispose old appliance", price: 150, sortOrder: 2 },
                { type: "addon", name: "Disconnect/reconnect additional appliance", price: 250, sortOrder: 3 },
                { type: "addon", name: "Remove & dispose extra appliance", price: 120, sortOrder: 4 },
              ],
            },
          },
          {
            name: "Air Conditioning",
            sortOrder: 7,
            items: {
              create: [{ type: "fixed", name: "Install new air-conditioning circuit", price: 400, sortOrder: 1 }],
            },
          },
        ],
      },
    },
    include: {
      categories: {
        include: { items: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
};

export const GET = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  let profile = await db.pricingProfile.findFirst({
    where: { orgId },
    include: {
      categories: {
        include: { items: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    profile = await seedPricingProfile(orgId);
  }

  return NextResponse.json({ profile });
};

export const PATCH = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const body = await req.json();
  const profileId = String(body.profileId ?? "").trim();
  if (!profileId) {
    return NextResponse.json({ error: "Missing profile id" }, { status: 400 });
  }

  const toDecimal = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? null : new Prisma.Decimal(numberValue);
  };

  const updateData: Prisma.PricingProfileUpdateInput = {
    name: body.name ? String(body.name).trim() : undefined,
    region: body.region ? String(body.region).trim() : undefined,
    serviceAreaKm: body.serviceAreaKm != null ? Number(body.serviceAreaKm) : undefined,
    travelSurchargeEnabled: body.travelSurchargeEnabled ?? undefined,
    travelSurchargeAmount: toDecimal(body.travelSurchargeAmount) ?? undefined,
    minimumCharge: toDecimal(body.minimumCharge) ?? undefined,
    calloutFirstHour: toDecimal(body.calloutFirstHour) ?? undefined,
    hourlyRate: toDecimal(body.hourlyRate) ?? undefined,
    intervalMinutes: body.intervalMinutes != null ? Number(body.intervalMinutes) : undefined,
    intervalRate: toDecimal(body.intervalRate) ?? undefined,
    afterHoursMultiplier: toDecimal(body.afterHoursMultiplier) ?? undefined,
    gstRate: toDecimal(body.gstRate) ?? undefined,
    pricesIncludeGst: body.pricesIncludeGst ?? undefined,
    complianceText: body.complianceText ?? undefined,
    comparisonText: body.comparisonText ?? undefined,
    customerSummary: body.customerSummary ?? undefined,
    customerExplanation: body.customerExplanation ?? undefined,
  };

  const items: { id: string; price?: number; isActive?: boolean }[] = body.items ?? [];

  try {
    const updated = await db.$transaction(async (tx) => {
      const profile = await tx.pricingProfile.update({
        where: { id: profileId, orgId },
        data: updateData,
      });

      for (const item of items) {
        if (!item?.id) continue;
        const updateItem: Prisma.PricingItemUpdateInput = {};
        if (item.price != null && !Number.isNaN(Number(item.price))) {
          updateItem.price = new Prisma.Decimal(item.price);
        }
        if (typeof item.isActive === "boolean") {
          updateItem.isActive = item.isActive;
        }
        if (Object.keys(updateItem).length) {
          await tx.pricingItem.update({
            where: { id: item.id },
            data: updateItem,
          });
        }
      }

      return profile;
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    return NextResponse.json({ error: "Unable to update pricing" }, { status: 500 });
  }
};
