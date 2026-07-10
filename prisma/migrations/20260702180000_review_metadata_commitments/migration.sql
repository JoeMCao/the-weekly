ALTER TABLE "WeeklyReview" ADD COLUMN IF NOT EXISTS "reviewMetadata" JSONB NOT NULL DEFAULT '{"reviewDate":"","context":"","savedAt":null}';
ALTER TABLE "WeeklyReview" ADD COLUMN IF NOT EXISTS "priorWeekCommitments" JSONB;
