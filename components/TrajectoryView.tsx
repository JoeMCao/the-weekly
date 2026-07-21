import Link from "next/link";
import { ViewPageHeader } from "@/components/ViewPageHeader";
import { PRINCIPLES, statusEmoji } from "@/lib/principles";
import {
  isReviewComplete,
  reviewHasSubstance,
  type WeeklyReviewSummary,
} from "@/lib/reviews";
import { formatWeekRange } from "@/lib/week";

export function TrajectoryView({
  reviews,
  currentWeekStart,
}: {
  reviews: WeeklyReviewSummary[];
  currentWeekStart: string;
}) {
  const weeks = [...reviews]
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .map((review) => toTrajectoryWeek(review, currentWeekStart));

  return (
    <section className="flex flex-col">
      <ViewPageHeader
        eyebrow="Trajectory"
        title="Who am I becoming?"
        dek={
          <p>
            Patterns over time. Tap any week to review or fill it in.
          </p>
        }
      />

      <ul className="mt-12 flex flex-col gap-10">
        {weeks.map((week) => (
          <li key={week.weekStart}>
            <Link
              href={`/review?week=${week.weekStart}`}
              className="group block rounded-xl border border-transparent px-3 py-3 -mx-3 transition-colors hover:border-line-subtle hover:bg-white/60"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-serif text-xl text-ink transition-colors group-hover:text-ink-soft">
                  {formatWeekRange(week.weekStart)}
                </span>
                <span className="text-sm text-ink-faint">{week.statusLabel}</span>
              </div>

              {week.isCurrent && (
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-faint">
                  This week
                </p>
              )}

              {week.preview && (
                <p className="mt-3 font-serif text-sm italic leading-relaxed text-ink-soft">
                  {week.preview}
                </p>
              )}

              {week.principleLines.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                  {week.principleLines.map((line) => (
                    <li key={line.key} className="text-sm text-ink-soft">
                      {statusEmoji(line.status)} {line.label}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-3 text-xs text-ink-faint transition-colors group-hover:text-ink-soft">
                {week.actionLabel} →
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {weeks.length === 0 && (
        <p className="mt-12 font-serif text-base italic text-ink-faint">
          No weeks in the calendar yet.
        </p>
      )}
    </section>
  );
}

type TrajectoryWeek = {
  weekStart: string;
  isCurrent: boolean;
  statusLabel: string;
  actionLabel: string;
  preview: string | null;
  principleLines: { key: string; label: string; status: "yes" | "somewhat" | "no" }[];
};

function toTrajectoryWeek(
  review: WeeklyReviewSummary,
  currentWeekStart: string,
): TrajectoryWeek {
  const hasSubstance = reviewHasSubstance(review);
  const complete = isReviewComplete(review);

  let statusLabel: string;
  let actionLabel: string;
  if (!hasSubstance) {
    statusLabel = "⬜ Not started";
    actionLabel = "Start review";
  } else if (complete) {
    statusLabel = "✅ Complete";
    actionLabel = "Review";
  } else {
    statusLabel = "◐ In progress";
    actionLabel = "Continue review";
  }

  const principleLines = PRINCIPLES.flatMap((meta) => {
    const p = review.principles.find((x) => x.key === meta.key);
    if (!p?.status) return [];
    return [
      {
        key: meta.key,
        label: meta.trajectoryLabel,
        status: p.status,
      },
    ];
  });

  return {
    weekStart: review.weekStart,
    isCurrent: review.weekStart === currentWeekStart,
    statusLabel,
    actionLabel,
    preview: buildPreview(review),
    principleLines,
  };
}

function buildPreview(review: WeeklyReviewSummary): string | null {
  const commitments = review.weeklyReflection.nextWeekCommitments
    .filter((c) => c.text.trim())
    .map((c) => c.text.trim());
  if (commitments.length > 0) {
    return commitments.slice(0, 2).join(" · ");
  }
  if (review.weeklyReflection.theme.trim()) {
    return review.weeklyReflection.theme.trim();
  }
  if (review.weeklyReflection.weekSummary.trim()) {
    return review.weeklyReflection.weekSummary.trim();
  }
  if (review.weeklyReflection.wins.trim()) {
    return review.weeklyReflection.wins.trim();
  }
  return null;
}
