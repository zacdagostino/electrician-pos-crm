import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { db } from "@/lib/db";

export const POST = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const orgId = String(body.orgId || "").trim();

    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    const membership = await db.orgMember.findFirst({
      where: {
        userId: session.user.id,
        orgId,
        status: "active",
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of org" }, { status: 403 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("org_id", orgId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Unable to select org" }, { status: 500 });
  }
};
