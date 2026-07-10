-- Weekly review redesign: principles + weekly reflection only.

ALTER TABLE "WeeklyReview" ADD COLUMN IF NOT EXISTS "weeklyReflection" JSONB NOT NULL DEFAULT '{"evidenceReview":"","wins":"","attentionRequired":"","theme":"","oneCommitment":""}';

ALTER TABLE "WeeklyReview" DROP COLUMN IF EXISTS "alignmentScore";
ALTER TABLE "WeeklyReview" DROP COLUMN IF EXISTS "alignmentReason";
ALTER TABLE "WeeklyReview" DROP COLUMN IF EXISTS "faults";
ALTER TABLE "WeeklyReview" DROP COLUMN IF EXISTS "provedMeWrong";
ALTER TABLE "WeeklyReview" DROP COLUMN IF EXISTS "avoiding";
ALTER TABLE "WeeklyReview" DROP COLUMN IF EXISTS "commitments";
ALTER TABLE "WeeklyReview" DROP COLUMN IF EXISTS "nextWeekJose";
