import {
  computeCommitmentScore,
  formatCommitmentScore,
  formatPreviousCommitmentSourceRange,
  previousCommitmentStatusLabel,
  type PreviousCommitment,
} from "@/lib/commitments";
import type { DailyNoteData } from "@/lib/daily-notes";
import {
  PRINCIPLES,
  computeWeeklyScore,
  formatWeeklyScore,
  statusLabel,
  type PrincipleReview,
} from "@/lib/principles";
import type { WeeklyReviewSummary } from "@/lib/reviews";
import {
  formatDayNoteLabel,
  formatWeekRange,
} from "@/lib/week";

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

function formatThisWeeksCommitments(
  lines: string[],
  commitments: PreviousCommitment[],
) {
  if (commitments.length === 0) return;

  pushSection(lines, "This Week's Commitments");
  lines.push("The commitments you chose during last week's review.");
  lines.push("");

  const sourceRange = formatPreviousCommitmentSourceRange(commitments);
  if (sourceRange) {
    lines.push(`From ${sourceRange}`);
    lines.push("");
  }

  for (const item of commitments) {
    const mark = item.status === "completed" ? "☑" : "☐";
    const status = previousCommitmentStatusLabel(item.status);
    lines.push(`${mark} ${item.text.trim()} — ${status}`);
  }
}

function formatDailyNotes(lines: string[], notes: DailyNoteData[]) {
  const filled = notes.filter((n) => hasText(n.content));
  if (filled.length === 0) return;

  pushSection(lines, "Daily Notes");
  lines.push("Capture what is happening while it is happening.");
  lines.push("");

  for (const note of filled) {
    lines.push(formatDayNoteLabel(note.noteDate));
    lines.push(note.content.trimEnd());
    lines.push("");
  }
}

function formatReviewMetadata(
  lines: string[],
  review: WeeklyReviewSummary,
) {
  const { reviewDate, context } = review.reviewMetadata;
  if (!hasText(reviewDate) && !hasText(context)) return;

  pushSection(lines, "Review Metadata");

  if (hasText(reviewDate)) {
    lines.push("Review Date");
    lines.push(reviewDate.trim());
    lines.push("");
  }

  if (hasText(context)) {
    lines.push("Context");
    lines.push("Anything unusual about this review?");
    lines.push(context.trimEnd());
    lines.push("");
  }
}

function formatLastWeeksCommitmentsScore(
  lines: string[],
  commitments: PreviousCommitment[],
) {
  const score = computeCommitmentScore(commitments);
  if (score.total === 0) return;

  pushSection(lines, "Last Week's Commitments");

  const sourceRange = formatPreviousCommitmentSourceRange(commitments);
  if (sourceRange) {
    lines.push(`From ${sourceRange}`);
    lines.push("");
  }

  lines.push(
    `Commitment Score: ${formatCommitmentScore(score.score, score.total)} completed`,
  );
  lines.push("");

  for (const item of commitments) {
    lines.push(
      `${item.text.trim()} — ${previousCommitmentStatusLabel(item.status)}`,
    );
  }
}

function formatWeeklyScoreSummary(
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
  lines.push("");

  for (const meta of PRINCIPLES) {
    const p = principles.find((x) => x.key === meta.key);
    lines.push(`${meta.trajectoryLabel}: ${statusLabel(p?.status ?? null)}`);
  }
}

function formatPrinciples(lines: string[], principles: PrincipleReview[]) {
  for (const meta of PRINCIPLES) {
    const p = principles.find((x) => x.key === meta.key);
    if (!p) continue;

    const hasStatus = p.status !== null;
    const hasReflection = hasText(p.reflection);
    const hasEvidence = hasText(p.evidence);
    if (!hasStatus && !hasReflection && !hasEvidence) continue;

    pushSection(lines, meta.title);
    lines.push(meta.summary);
    lines.push("");
    lines.push("Failure mode");
    lines.push(meta.failureMode);
    lines.push("");

    if (hasStatus) {
      lines.push("Rating");
      lines.push(statusLabel(p.status));
      lines.push("");
    }

    lines.push("Question");
    lines.push(meta.question);
    lines.push("");

    if (hasReflection) {
      lines.push("Reflection");
      lines.push(p.reflection.trimEnd());
      lines.push("");
    }

    if (hasEvidence) {
      lines.push("Evidence");
      lines.push("What specific evidence supports your answer?");
      lines.push(p.evidence.trimEnd());
      lines.push("");
    }
  }
}

function formatCloseTheWeek(
  lines: string[],
  reflection: WeeklyReviewSummary["weeklyReflection"],
) {
  const fields: { label: string; hint?: string; value: string }[] = [
    {
      label: "Week Summary",
      hint: "What was this week really about?",
      value: reflection.weekSummary,
    },
    {
      label: "Wins",
      hint: "What am I proud of?",
      value: reflection.wins,
    },
    {
      label: "Attention Required",
      hint: "What needs attention next week?",
      value: reflection.attentionRequired,
    },
    {
      label: "Recurring Pattern",
      hint: "What pattern showed up again this week?",
      value: reflection.recurringPattern,
    },
    {
      label: "Theme",
      hint: "What was the central lesson or theme of this week?",
      value: reflection.theme,
    },
  ];

  const filled = fields.filter((f) => hasText(f.value));
  if (filled.length === 0) return;

  pushSection(lines, "Close the Week");

  for (const field of filled) {
    lines.push(field.label);
    if (field.hint) lines.push(field.hint);
    lines.push(field.value.trimEnd());
    lines.push("");
  }
}

function formatNextWeekCommitments(
  lines: string[],
  reflection: WeeklyReviewSummary["weeklyReflection"],
) {
  const commitments = reflection.nextWeekCommitments.filter((c) =>
    hasText(c.text),
  );
  if (commitments.length === 0) return;

  pushSection(lines, "Next Week Commitments");
  lines.push("What would make next week a win?");
  lines.push("");

  commitments.forEach((commitment, i) => {
    lines.push(`${i + 1}. ${commitment.text.trim()}`);
  });
}

/**
 * Formats the Weekly Compass as plain text for clipboard copy.
 * Uses the same PRINCIPLES config and review data as the live UI.
 */
export function formatWeeklyCompassForClipboard(
  review: WeeklyReviewSummary,
  dailyNotes: DailyNoteData[],
): string {
  const lines: string[] = [];

  lines.push("WEEKLY COMPASS");
  lines.push("");
  lines.push(formatWeekRange(review.weekStart));

  formatThisWeeksCommitments(lines, review.previousCommitments);
  formatDailyNotes(lines, dailyNotes);
  formatReviewMetadata(lines, review);
  formatLastWeeksCommitmentsScore(lines, review.previousCommitments);
  formatWeeklyScoreSummary(lines, review.principles, review.weekStart);
  formatPrinciples(lines, review.principles);
  formatCloseTheWeek(lines, review.weeklyReflection);
  formatNextWeekCommitments(lines, review.weeklyReflection);

  // Trim trailing blank lines, then append the export end marker.
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  lines.push("");
  lines.push("END OF WEEKLY COMPASS");

  return lines.join("\n");
}
