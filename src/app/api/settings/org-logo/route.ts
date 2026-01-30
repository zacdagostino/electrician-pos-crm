import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

const MAX_FILE_SIZE_MB = 2;

export const POST = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const formData = await req.formData();
  const remove = formData.get("remove");
  if (remove) {
    await db.org.update({
      where: { id: orgId },
      data: { logoUrl: null },
    });
    return NextResponse.json({ ok: true });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Logo file is required" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: "Logo file too large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mime = file.type || "image/png";
  const dataUrl = `data:${mime};base64,${base64}`;

  await db.org.update({
    where: { id: orgId },
    data: { logoUrl: dataUrl },
  });

  return NextResponse.json({ ok: true });
};
