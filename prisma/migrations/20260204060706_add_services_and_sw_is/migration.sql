-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSWI" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceSWI_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_orgId_idx" ON "Service"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_orgId_name_key" ON "Service"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSWI_serviceId_key" ON "ServiceSWI"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceSWI_orgId_idx" ON "ServiceSWI"("orgId");

-- CreateIndex
CREATE INDEX "ServiceSWI_serviceId_idx" ON "ServiceSWI"("serviceId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSWI" ADD CONSTRAINT "ServiceSWI_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSWI" ADD CONSTRAINT "ServiceSWI_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
