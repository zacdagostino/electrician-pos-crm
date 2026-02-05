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
  const job = await db.job.findFirst({
    where: { id: jobId, orgId },
    include: { customer: true, quotes: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
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

  const jobId = await getJobId(params);
  const body = await req.json().catch(() => ({}));

  const existingJob = await db.job.findFirst({
    where: { id: jobId, orgId },
    select: { assignedToMemberId: true },
  });

  if (!existingJob) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const status =
    typeof body.status === "string" &&
    ["pending", "in_progress", "completed", "cancelled"].includes(body.status)
      ? body.status
      : undefined;

  const parseDateInput = (value: unknown) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return "invalid";
    return date;
  };

  const scheduledStart = parseDateInput(body.scheduledStart);
  if (scheduledStart === "invalid") {
    return NextResponse.json({ error: "Invalid schedule start date." }, { status: 400 });
  }
  const scheduledEnd = parseDateInput(body.scheduledEnd);
  if (scheduledEnd === "invalid") {
    return NextResponse.json({ error: "Invalid schedule end date." }, { status: 400 });
  }
  const scheduledAllDay =
    body.scheduledAllDay === undefined ? undefined : Boolean(body.scheduledAllDay);
  const scheduledNotes =
    body.scheduledNotes === undefined ? undefined : String(body.scheduledNotes || "").trim();

  if (
    scheduledStart &&
    scheduledEnd &&
    scheduledStart instanceof Date &&
    scheduledEnd instanceof Date &&
    scheduledEnd.getTime() < scheduledStart.getTime()
  ) {
    return NextResponse.json(
      { error: "Schedule end must be after the start time." },
      { status: 400 }
    );
  }

  let assignedToMemberId: string | undefined;
  if (body.assignedToMemberId !== undefined) {
    const nextId = String(body.assignedToMemberId ?? "").trim();
    if (!nextId) {
      return NextResponse.json(
        { error: "Assigned electrician is required." },
        { status: 400 }
      );
    }
    const member = await db.orgMember.findFirst({
      where: {
        id: nextId,
        orgId,
        tradeRole: { in: ["electrician", "apprentice"] },
      },
    });
    if (!member) {
      return NextResponse.json({ error: "Invalid electrician." }, { status: 400 });
    }
    assignedToMemberId = member.id;
  }

  if (!assignedToMemberId && !existingJob.assignedToMemberId) {
    return NextResponse.json(
      { error: "Assigned electrician is required." },
      { status: 400 }
    );
  }

  let latestQuoteId: string | null = null;
  if (status === "in_progress") {
    const latestQuote = await db.quote.findFirst({
      where: { orgId, jobId },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    latestQuoteId = latestQuote?.id ?? null;
    if (!body.forceStatus && (!latestQuote || latestQuote.status !== "accepted")) {
      return NextResponse.json(
        {
          error: "Quote has not been accepted yet.",
          message: "Has the client accepted the quote?",
          requiresConfirmation: true,
        },
        { status: 409 }
      );
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const saved = await tx.job.update({
      where: { id: jobId, orgId },
      data: {
        title: body.title ? String(body.title).trim() : undefined,
        status,
        assignedToMemberId,
        customerName: body.customerName ? String(body.customerName).trim() : undefined,
        customerEmail: body.customerEmail ? String(body.customerEmail).trim() : undefined,
        customerPhone: body.customerPhone ? String(body.customerPhone).trim() : undefined,
        siteLine1: body.siteLine1 ? String(body.siteLine1).trim() : undefined,
        siteLine2: body.siteLine2 ? String(body.siteLine2).trim() : undefined,
        siteSuburb: body.siteSuburb ? String(body.siteSuburb).trim() : undefined,
        siteState: body.siteState ? String(body.siteState).trim() : undefined,
        sitePostcode: body.sitePostcode ? String(body.sitePostcode).trim() : undefined,
        notes: body.notes ? String(body.notes).trim() : undefined,
        scheduledStart: scheduledStart === undefined ? undefined : scheduledStart,
        scheduledEnd: scheduledEnd === undefined ? undefined : scheduledEnd,
        scheduledAllDay,
        scheduledNotes,
      },
    });

    if (status === "in_progress" && body.forceStatus && latestQuoteId) {
      await tx.quote.update({
        where: { id: latestQuoteId, orgId },
        data: { status: "accepted" },
      });
    }

    return saved;
  });

  return NextResponse.json({ job: updated });
};

export const DELETE = async (_req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const jobId = await getJobId(params);
  const linkedQuote = await db.quote.findFirst({ where: { orgId, jobId } });
  if (linkedQuote) {
    return NextResponse.json(
      { error: "This job has linked quotes. Delete the quote first." },
      { status: 400 }
    );
  }

  await db.job.delete({ where: { id: jobId, orgId } });
  return NextResponse.json({ ok: true });
};
