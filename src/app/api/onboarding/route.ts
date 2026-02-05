import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { db } from "@/lib/db";
import { Prisma, type LocationType } from "@prisma/client";

export const POST = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const orgName = String(body.orgName || "").trim();
    const abn = body.abn ? String(body.abn).trim() : null;
    const gstRateRaw = body.defaultGstRate ?? 0.1;
    const defaultGstRate = Number(gstRateRaw);
    const locationName = String(body.locationName || "").trim();
    const locationTypeRaw = String(body.locationType || "van");
    const allowedLocationTypes: LocationType[] = ["van", "warehouse", "store", "site"];
    const locationType = allowedLocationTypes.includes(locationTypeRaw as LocationType)
      ? (locationTypeRaw as LocationType)
      : "van";

    if (!orgName || !locationName) {
      return NextResponse.json(
        { error: "Org name and first location are required" },
        { status: 400 }
      );
    }

    if (Number.isNaN(defaultGstRate) || defaultGstRate < 0 || defaultGstRate > 1) {
      return NextResponse.json(
        { error: "GST rate must be between 0 and 1" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json(
        { error: "User account not found. Please sign in again." },
        { status: 401 }
      );
    }

    const org = await db.$transaction(async (tx) => {
      const createdOrg = await tx.org.create({
        data: {
          name: orgName,
          abn,
          defaultGstRate,
        },
      });

      await tx.orgMember.create({
        data: {
          orgId: createdOrg.id,
          userId: user.id,
          role: "owner",
          status: "active",
        },
      });

      await tx.location.create({
        data: {
          orgId: createdOrg.id,
          name: locationName,
          type: locationType,
        },
      });

      return createdOrg;
    });

    const response = NextResponse.json({ orgId: org.id }, { status: 201 });
    response.cookies.set("org_id", org.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Onboarding failed:", error);

    let detail: string | undefined;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      detail = error.code;
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      detail = "Validation error";
    } else if (error instanceof Error) {
      detail = error.message;
    }

    return NextResponse.json(
      {
        error: "Unable to complete onboarding",
        detail: process.env.NODE_ENV === "production" ? undefined : detail,
      },
      { status: 500 }
    );
  }
};
