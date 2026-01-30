-- CreateEnum
CREATE TYPE "PricingItemType" AS ENUM ('fixed', 'addon');

-- CreateTable
CREATE TABLE "PricingProfile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "serviceAreaKm" INTEGER DEFAULT 20,
    "travelSurchargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "travelSurchargeAmount" DECIMAL(10,2),
    "minimumCharge" DECIMAL(10,2) NOT NULL,
    "calloutFirstHour" DECIMAL(10,2) NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "intervalRate" DECIMAL(10,2) NOT NULL,
    "afterHoursMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.5,
    "gstRate" DECIMAL(4,2) NOT NULL DEFAULT 0.10,
    "pricesIncludeGst" BOOLEAN NOT NULL DEFAULT true,
    "complianceText" TEXT,
    "comparisonText" TEXT,
    "customerSummary" TEXT,
    "customerExplanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCategory" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PricingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "PricingItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PricingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingProfile_orgId_idx" ON "PricingProfile"("orgId");

-- AddForeignKey
ALTER TABLE "PricingProfile" ADD CONSTRAINT "PricingProfile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCategory" ADD CONSTRAINT "PricingCategory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PricingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingItem" ADD CONSTRAINT "PricingItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PricingCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
