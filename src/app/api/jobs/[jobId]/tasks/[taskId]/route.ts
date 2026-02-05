import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

type Params = { params: Promise<{ jobId: string; taskId: string }> };

const getParams = async (params: Params["params"]) => {
  const resolved = await params;
  return { jobId: resolved.jobId, taskId: resolved.taskId };
};

export const PATCH = async (req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const { jobId, taskId } = await getParams(params);
  const body = await req.json().catch(() => ({}));
  const nextStatus = String(body.status ?? "").trim();

  if (!["pending", "completed"].includes(nextStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const member = await db.orgMember.findFirst({
    where: { orgId, userId: session.user.id },
  });

  if (!member) {
    return NextResponse.json({ error: "Membership not found." }, { status: 403 });
  }

  const updated = await db.jobTask.update({
    where: { id: taskId, orgId, jobId },
    data: {
      status: nextStatus,
      completedAt: nextStatus === "completed" ? new Date() : null,
      completedByMemberId: nextStatus === "completed" ? member.id : null,
    },
  });

  return NextResponse.json({
    task: {
      id: updated.id,
      status: updated.status,
      completedAt: updated.completedAt,
    },
  });
};
