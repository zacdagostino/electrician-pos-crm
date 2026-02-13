-- Add refunded status to PosSaleStatus enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'refunded'
      AND enumtypid = '"PosSaleStatus"'::regtype
  ) THEN
    ALTER TYPE "PosSaleStatus" ADD VALUE 'refunded';
  END IF;
END $$;

-- Add optional job link to POS sales
ALTER TABLE "PosSale"
ADD COLUMN "jobId" TEXT;

CREATE INDEX "PosSale_jobId_idx" ON "PosSale"("jobId");

ALTER TABLE "PosSale"
ADD CONSTRAINT "PosSale_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
