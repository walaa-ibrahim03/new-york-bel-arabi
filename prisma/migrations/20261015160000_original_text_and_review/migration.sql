-- Prepared only. Apply separately after approval and staging verification.
-- No backfill: existing translated text must not be mislabeled as original.
ALTER TABLE "Article"
  ADD COLUMN "originalTitle" TEXT,
  ADD COLUMN "originalSummary" TEXT,
  ADD COLUMN "originalContent" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedBy" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
