CREATE TABLE "JobTask" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "sourceQuoteId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "completedAt" TIMESTAMP(3),
  "completedByMemberId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobTask_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "JobTask"
ADD CONSTRAINT "JobTask_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JobTask"
ADD CONSTRAINT "JobTask_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobTask"
ADD CONSTRAINT "JobTask_sourceQuoteId_fkey" FOREIGN KEY ("sourceQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "JobTask"
ADD CONSTRAINT "JobTask_completedByMemberId_fkey" FOREIGN KEY ("completedByMemberId") REFERENCES "OrgMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "JobTask_orgId_idx" ON "JobTask"("orgId");
CREATE INDEX "JobTask_jobId_idx" ON "JobTask"("jobId");
CREATE INDEX "JobTask_sourceQuoteId_idx" ON "JobTask"("sourceQuoteId");
CREATE INDEX "JobTask_completedByMemberId_idx" ON "JobTask"("completedByMemberId");
