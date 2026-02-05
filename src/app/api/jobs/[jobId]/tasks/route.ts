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
  const tasks = await db.jobTask.findMany({
    where: { orgId, jobId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { completedBy: { include: { user: true } } },
  });

  return NextResponse.json({
    tasks: tasks.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      completedAt: task.completedAt,
      completedByName: task.completedBy?.user?.name ?? task.completedBy?.user?.email ?? null,
    })),
  });
};
