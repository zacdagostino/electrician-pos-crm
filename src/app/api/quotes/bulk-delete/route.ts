import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

type Payload = {
  quoteIds?: string[];
  deleteLinkedJobs?: boolean;
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
  const quoteIds = Array.isArray(body.quoteIds)
    ? body.quoteIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const deleteLinkedJobs = Boolean(body.deleteLinkedJobs);

  if (!quoteIds.length) {
    return NextResponse.json({ error: "No quotes selected." }, { status: 400 });
  }

  const quotes = await db.quote.findMany({
    where: { orgId, id: { in: quoteIds } },
    select: { id: true, jobId: true },
  });

  if (!quotes.length) {
    return NextResponse.json({ error: "Quotes not found." }, { status: 404 });
  }

  const jobIds = Array.from(new Set(quotes.map((q) => q.jobId).filter(Boolean))) as string[];
  if (jobIds.length && !deleteLinkedJobs) {
    return NextResponse.json(
      { error: "Some quotes are linked to jobs. Confirm job deletion to continue." },
      { status: 400 }
    );
  }

  const allQuoteIds = deleteLinkedJobs
    ? Array.from(
        new Set([
          ...quotes.map((q) => q.id),
          ...(await db.quote
            .findMany({
              where: { orgId, jobId: { in: jobIds } },
              select: { id: true },
            })
            .then((rows) => rows.map((row) => row.id))),
        ])
      )
    : quotes.map((q) => q.id);

  await db.$transaction(async (tx) => {
    await deleteQuotes(tx, orgId, allQuoteIds);
    if (deleteLinkedJobs && jobIds.length) {
      await tx.job.deleteMany({ where: { orgId, id: { in: jobIds } } });
    }
  });

  return NextResponse.json({
    ok: true,
    deletedQuotes: allQuoteIds.length,
    deletedJobs: deleteLinkedJobs ? jobIds.length : 0,
  });
};
