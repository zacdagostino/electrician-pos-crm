-- CreateTable
CREATE TABLE "QuoteHistory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "title" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "siteLine1" TEXT NOT NULL,
    "siteLine2" TEXT,
    "siteSuburb" TEXT,
    "siteState" TEXT,
    "sitePostcode" TEXT,
    "pricingProfileId" TEXT,
    "travelSurchargeApplied" BOOLEAN NOT NULL DEFAULT false,
    "travelSurchargeAmount" DECIMAL(10,2),
    "minimumChargeApplied" BOOLEAN NOT NULL DEFAULT false,
    "minimumChargeAmount" DECIMAL(10,2),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "gstAmount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "jobId" TEXT,
    "customerId" TEXT,
    "assignedToMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteHistoryItem" (
    "id" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "pricingItemId" TEXT,
    "type" "QuoteItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "QuoteHistoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteHistory_orgId_idx" ON "QuoteHistory"("orgId");

-- CreateIndex
CREATE INDEX "QuoteHistory_quoteId_idx" ON "QuoteHistory"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteHistory_createdAt_idx" ON "QuoteHistory"("createdAt");

-- CreateIndex
CREATE INDEX "QuoteHistoryItem_historyId_idx" ON "QuoteHistoryItem"("historyId");

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteHistoryItem" ADD CONSTRAINT "QuoteHistoryItem_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "QuoteHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
