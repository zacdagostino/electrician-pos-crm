import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

type Payload = {
  jobIds?: string[];
  deleteLinkedQuotes?: boolean;
};

const deleteQuotes = async (
  tx: Prisma.TransactionClient,
  orgId: string,
  quoteIds: string[]
) => {
  if (!quoteIds.length) return;
  const histories = await tx.quoteHistory.findMany({
    where: { orgId, quoteId: { in: quoteIds } },
    select: { id: true },
  });
  const historyIds = histories.map((h) => h.id);
  if (historyIds.length) {
    await tx.quoteHistoryItem.deleteMany({ where: { historyId: { in: historyIds } } });
    await tx.quoteHistory.deleteMany({ where: { id: { in: historyIds } } });
  }
  await tx.jobTask.deleteMany({ where: { orgId, sourceQuoteId: { in: quoteIds } } });
  await tx.quoteItem.deleteMany({ where: { quoteId: { in: quoteIds } } });
  await tx.quote.deleteMany({ where: { orgId, id: { in: quoteIds } } });
};

export const POST = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Payload;
  const jobIds = Array.isArray(body.jobIds)
    ? body.jobIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const deleteLinkedQuotes = Boolean(body.deleteLinkedQuotes);

  if (!jobIds.length) {
    return NextResponse.json({ error: "No jobs selected." }, { status: 400 });
  }

  const jobs = await db.job.findMany({
    where: { orgId, id: { in: jobIds } },
    select: { id: true },
  });

  if (!jobs.length) {
    return NextResponse.json({ error: "Jobs not found." }, { status: 404 });
  }

  const linkedQuotes = await db.quote.findMany({
    where: { orgId, jobId: { in: jobIds } },
    select: { id: true },
  });
  if (linkedQuotes.length && !deleteLinkedQuotes) {
    return NextResponse.json(
      { error: "Some jobs have linked quotes. Confirm quote deletion to continue." },
      { status: 400 }
    );
  }

  await db.$transaction(async (tx) => {
    if (deleteLinkedQuotes && linkedQuotes.length) {
      await deleteQuotes(tx, orgId, linkedQuotes.map((q) => q.id));
    }
    await tx.job.deleteMany({ where: { orgId, id: { in: jobIds } } });
  });

  return NextResponse.json({
    ok: true,
    deletedJobs: jobIds.length,
    deletedQuotes: deleteLinkedQuotes ? linkedQuotes.length : 0,
  });
};
