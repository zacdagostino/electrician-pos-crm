-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- AlterEnum
ALTER TYPE "QuoteStatus" ADD VALUE 'pending';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "jobId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'draft';

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "title" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "siteLine1" TEXT NOT NULL,
    "siteLine2" TEXT,
    "siteSuburb" TEXT,
    "siteState" TEXT,
    "sitePostcode" TEXT,
    "notes" TEXT,
    "travelSurchargeApplied" BOOLEAN NOT NULL DEFAULT false,
    "travelSurchargeAmount" DECIMAL(10,2),
    "minimumChargeApplied" BOOLEAN NOT NULL DEFAULT false,
    "minimumChargeAmount" DECIMAL(10,2),
    "subtotal" DECIMAL(12,2),
    "gstAmount" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "quotePdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_orgId_idx" ON "Job"("orgId");

-- CreateIndex
CREATE INDEX "Job_customerId_idx" ON "Job"("customerId");

-- CreateIndex
CREATE INDEX "Quote_jobId_idx" ON "Quote"("jobId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
