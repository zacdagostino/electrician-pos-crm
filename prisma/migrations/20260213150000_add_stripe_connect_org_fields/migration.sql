ALTER TABLE "Org"
  ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Org_stripeAccountId_key" ON "Org"("stripeAccountId");
