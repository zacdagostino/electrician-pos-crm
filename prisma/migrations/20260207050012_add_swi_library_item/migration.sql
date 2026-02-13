-- CreateEnum
CREATE TYPE "SWILibraryType" AS ENUM ('ppe', 'tool', 'test', 'part', 'hazard', 'step', 'definition');

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "serviceId" TEXT;

-- CreateTable
CREATE TABLE "SWILibraryItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "SWILibraryType" NOT NULL,
    "name" TEXT NOT NULL,
    "usage" TEXT,
    "howTo" TEXT,
    "photoUrls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SWILibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SWILibraryItem_orgId_idx" ON "SWILibraryItem"("orgId");

-- CreateIndex
CREATE INDEX "SWILibraryItem_type_idx" ON "SWILibraryItem"("type");

-- CreateIndex
CREATE INDEX "QuoteItem_pricingItemId_idx" ON "QuoteItem"("pricingItemId");

-- CreateIndex
CREATE INDEX "QuoteItem_serviceId_idx" ON "QuoteItem"("serviceId");

-- AddForeignKey
ALTER TABLE "SWILibraryItem" ADD CONSTRAINT "SWILibraryItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
