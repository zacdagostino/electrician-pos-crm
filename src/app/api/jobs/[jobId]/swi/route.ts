import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

type Params = { params: Promise<{ jobId: string }> };

const getJobId = async (params: Params["params"]) => {
  const resolved = await params;
  return resolved.jobId;
};

export const GET = async (_req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const jobId = await getJobId(params);
  const swi = await db.jobSWI.findFirst({ where: { orgId, jobId } });

  return NextResponse.json({ swi });
};

export const PUT = async (req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const jobId = await getJobId(params);
  const body = await req.json().catch(() => ({}));

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const swi = await db.jobSWI.upsert({
    where: { jobId },
    create: { orgId, jobId, content: body },
    update: { content: body },
  });

  return NextResponse.json({ swi });
};
