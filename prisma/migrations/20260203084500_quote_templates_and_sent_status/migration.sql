-- CreateEnum
CREATE TYPE "QuoteSentVia" AS ENUM ('email', 'sms');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "sentVia" "QuoteSentVia";

-- CreateTable
CREATE TABLE "QuoteTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "blocks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteTemplate_orgId_idx" ON "QuoteTemplate"("orgId");

-- AddForeignKey
ALTER TABLE "QuoteTemplate" ADD CONSTRAINT "QuoteTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
