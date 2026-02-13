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
    const accessRole = body.accessRole ? String(body.accessRole) : null;
    if (tradeRole && !["electrician", "apprentice", "office"].includes(tradeRole)) {
      return NextResponse.json({ error: "Invalid trade role" }, { status: 400 });
    }
    if (accessRole && !["owner", "admin", "staff"].includes(accessRole)) {
      return NextResponse.json({ error: "Invalid access role" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone,
      },
      select: { id: true, name: true, phone: true },
    });

    if (tradeRole || accessRole) {
      const orgId = await getSelectedOrgId();
      if (!orgId) {
        return NextResponse.json(user);
      }

      const membership = await db.orgMember.findFirst({
        where: { orgId, userId: session.user.id, status: "active" },
        select: { role: true },
      });
      if (!membership) {
        return NextResponse.json({ error: "Membership not found" }, { status: 404 });
      }

      if (accessRole) {
        if (membership.role === "owner" && accessRole !== "owner") {
          return NextResponse.json(
            { error: "Owner role cannot be changed here." },
            { status: 400 }
          );
        }
        if (membership.role === "staff" && accessRole !== "staff") {
          return NextResponse.json(
            { error: "Only owners can promote staff to admin." },
            { status: 403 }
          );
        }
      }

      await db.orgMember.updateMany({
        where: { orgId, userId: session.user.id },
        data: {
          ...(tradeRole ? { tradeRole } : {}),
          ...(accessRole ? { role: accessRole } : {}),
        },
      });
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Unable to update profile" }, { status: 500 });
  }
};
