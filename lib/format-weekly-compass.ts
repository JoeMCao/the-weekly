import {
  computeCommitmentScore,
  formatCommitmentScore,
  formatPreviousCommitmentSourceRange,
  previousCommitmentStatusLabel,
  type PreviousCommitment,
} from "@/lib/commitments";
import {
  PRINCIPLES,
  computeWeeklyScore,
  formatWeeklyScore,
  statusLabel,
  type PrincipleReview,
} from "@/lib/principles";
import type { WeeklyReviewSummary } from "@/lib/reviews";
import { formatWeekRange } from "@/lib/week";

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function pushBlank(lines: string[]) {
  if (lines.length === 0) return;
  if (lines[lines.length - 1] !== "") lines.push("");
}

function pushSection(lines: string[], title: string) {
  pushBlank(lines);
  lines.push(title.toUpperCase());
  lines.push("");
}

function formatWeeklyReflection(
  lines: string[],
  reflection: WeeklyReviewSummary["weeklyReflection"],
) {
  const fields: { label: string; value: string }[] = [
    { label: "Week Summary", value: reflection.weekSummary },
    { label: "Wins", value: reflection.wins },
    { label: "Attention Required", value: reflection.attentionRequired },
    { label: "Recurring Patterns", value: reflection.recurringPattern },
    { label: "Theme of the Week", value: reflection.theme },
  ];

  const filled = fields.filter((f) => hasText(f.value));
  if (filled.length === 0) return;

  pushSection(lines, "Weekly Reflection");

  for (const field of filled) {
    lines.push(field.label);
    lines.push(field.value.trimEnd());
    lines.push("");
  }
}

function formatPrincipleReflections(
  lines: string[],
  principles: PrincipleReview[],
) {
  let any = false;
  for (const meta of PRINCIPLES) {
    const p = principles.find((x) => x.key === meta.key);
    if (!p || !hasText(p.reflection)) continue;
    if (!any) {
      pushSection(lines, "Principle Reflections");
      any = true;
    }
    lines.push(meta.title);
    lines.push(p.reflection.trimEnd());
    lines.push("");
  }
}

function formatCurrentWeekCommitmentReview(
  lines: string[],
  commitments: PreviousCommitment[],
) {
  if (commitments.length === 0) return;

  pushSection(lines, "Current-Week Commitment Review");

  const sourceRange = formatPreviousCommitmentSourceRange(commitments);
  if (sourceRange) {
    lines.push(`From ${sourceRange}`);
    lines.push("");
  }

  const score = computeCommitmentScore(commitments);
  if (score.total > 0) {
    lines.push(
      `Commitment Score: ${formatCommitmentScore(score.score, score.total)} completed`,
    );
    lines.push("");
  }

  for (const item of commitments) {
    const mark = item.status === "completed" ? "☑" : "☐";
    const status = previousCommitmentStatusLabel(item.status);
    lines.push(`${mark} ${item.text.trim()} — ${status}`);
  }
}

/**
 * Formats Part 1 (pre-mentor) as plain text for clipboard copy.
 * Does not include Part 2, ratings, scores, or instructional helper text.
 */
export function formatWeeklyCompassForClipboard(
  review: WeeklyReviewSummary,
  _dailyNotes?: unknown,
): string {
  const lines: string[] = [];

  lines.push("WEEKLY COMPASS");
  lines.push("");
  lines.push(formatWeekRange(review.weekStart));

  formatCurrentWeekCommitmentReview(lines, review.previousCommitments);
  formatPrincipleReflections(lines, review.principles);
  formatWeeklyReflection(lines, review.weeklyReflection);

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  lines.push("");
  lines.push("END OF WEEKLY REVIEW");

  return lines.join("\n");
}

/** Optional Part 2 serialization for future use / debugging. */
export function formatPrincipleAssessmentForClipboard(
  lines: string[],
  principles: PrincipleReview[],
) {
  const hasAnyRating = principles.some((p) => p.status !== null);
  if (!hasAnyRating) return;

  pushSection(lines, "Principle Assessment");

  for (const meta of PRINCIPLES) {
    const p = principles.find((x) => x.key === meta.key);
    lines.push(`${meta.title}: ${statusLabel(p?.status ?? null)}`);
  }
}

export function formatWeeklyScoreSummaryForClipboard(
  lines: string[],
  principles: PrincipleReview[],
  weekStart: string,
) {
  const { score, max } = computeWeeklyScore(principles);
  const hasAnyRating = principles.some((p) => p.status !== null);
  if (!hasAnyRating) return;

  pushSection(lines, "Weekly Score Summary");
  lines.push(formatWeekRange(weekStart));
  lines.push(`Weekly Score: ${formatWeeklyScore(score)} / ${max}`);
}
