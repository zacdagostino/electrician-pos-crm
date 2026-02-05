-- CreateEnum
CREATE TYPE "TradeRole" AS ENUM ('electrician', 'apprentice', 'office');

-- AlterTable
ALTER TABLE "OrgMember" ADD COLUMN     "tradeRole" "TradeRole" NOT NULL DEFAULT 'office';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "assignedToMemberId" TEXT;

-- CreateIndex
CREATE INDEX "Quote_assignedToMemberId_idx" ON "Quote"("assignedToMemberId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_assignedToMemberId_fkey" FOREIGN KEY ("assignedToMemberId") REFERENCES "OrgMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
