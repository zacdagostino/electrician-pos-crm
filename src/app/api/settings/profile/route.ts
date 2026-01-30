import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { db } from "@/lib/db";

export const PATCH = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = body.name ? String(body.name).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone,
      },
      select: { id: true, name: true, phone: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Unable to update profile" }, { status: 500 });
  }
};
