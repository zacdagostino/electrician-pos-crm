import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { db } from "@/lib/db";
import { getSelectedOrgId } from "@/lib/authz";

export const PATCH = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = body.name ? String(body.name).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const tradeRole = body.tradeRole ? String(body.tradeRole) : null;
    if (tradeRole && !["electrician", "apprentice", "office"].includes(tradeRole)) {
      return NextResponse.json({ error: "Invalid trade role" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone,
      },
      select: { id: true, name: true, phone: true },
    });

    if (tradeRole) {
      const orgId = await getSelectedOrgId();
      if (orgId) {
        await db.orgMember.updateMany({
          where: { orgId, userId: session.user.id },
          data: { tradeRole },
        });
      }
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Unable to update profile" }, { status: 500 });
  }
};
