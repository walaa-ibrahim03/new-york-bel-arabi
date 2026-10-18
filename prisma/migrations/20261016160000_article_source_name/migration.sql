-- Prepared only; requires separate approval before applying to any database.
-- Nullable, no backfill, no changes to existing rows or constraints.
ALTER TABLE "Article" ADD COLUMN "sourceName" TEXT;
