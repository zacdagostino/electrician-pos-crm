DO $$
BEGIN
  IF to_regclass('public."QuoteHistory"') IS NOT NULL THEN
    ALTER TABLE "QuoteHistory" DROP CONSTRAINT IF EXISTS "QuoteHistory_quoteId_fkey";
    ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
