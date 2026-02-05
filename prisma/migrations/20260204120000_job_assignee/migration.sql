ALTER TABLE "Job" ADD COLUMN "assignedToMemberId" TEXT;

ALTER TABLE "Job"
ADD CONSTRAINT "Job_assignedToMemberId_fkey"
FOREIGN KEY ("assignedToMemberId") REFERENCES "OrgMember"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Job_assignedToMemberId_idx" ON "Job"("assignedToMemberId");
