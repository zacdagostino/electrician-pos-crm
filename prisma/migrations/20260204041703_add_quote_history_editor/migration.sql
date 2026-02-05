-- DropForeignKey
ALTER TABLE "QuoteHistory" DROP CONSTRAINT "QuoteHistory_quoteId_fkey";

-- AlterTable
ALTER TABLE "QuoteHistory" ADD COLUMN     "changedByMemberId" TEXT;

-- CreateIndex
CREATE INDEX "QuoteHistory_changedByMemberId_idx" ON "QuoteHistory"("changedByMemberId");

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_changedByMemberId_fkey" FOREIGN KEY ("changedByMemberId") REFERENCES "OrgMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
