import Link from "next/link";
import { ViewPageHeader } from "@/components/ViewPageHeader";
import { PRINCIPLES, statusEmoji } from "@/lib/principles";
import {
  isReviewComplete,
  reviewHasSubstance,
  type WeeklyReviewSummary,
} from "@/lib/reviews";
import { addWeeks, formatWeekRangeShort } from "@/lib/week";

const LOOKBACK_WEEKS = 16;

export function TrajectoryView({
  reviews,
  currentWeekStart,
}: {
  reviews: WeeklyReviewSummary[];
  currentWeekStart: string;
}) {
  const weeks = buildTrajectoryWeeks(reviews, currentWeekStart);

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
                  {formatWeekRangeShort(week.weekStart)}
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

function buildTrajectoryWeeks(
  reviews: WeeklyReviewSummary[],
  currentWeekStart: string,
): TrajectoryWeek[] {
  const byWeek = new Map(reviews.map((r) => [r.weekStart, r]));

  let earliest = addWeeks(currentWeekStart, -(LOOKBACK_WEEKS - 1));
  if (reviews.length > 0 && reviews[0]!.weekStart < earliest) {
    earliest = reviews[0]!.weekStart;
  }

  const result: TrajectoryWeek[] = [];
  let cursor = earliest;

  while (cursor <= currentWeekStart) {
    const review = byWeek.get(cursor);
    const hasSubstance = review ? reviewHasSubstance(review) : false;
    const complete = review ? isReviewComplete(review) : false;

    let statusLabel: string;
    let actionLabel: string;
    if (!review || !hasSubstance) {
      statusLabel = "⬜ Not started";
      actionLabel = "Start review";
    } else if (complete) {
      statusLabel = "✅ Complete";
      actionLabel = "Review";
    } else {
      statusLabel = "◐ In progress";
      actionLabel = "Continue review";
    }

    const preview = review ? buildPreview(review) : null;
    const principleLines = review
      ? PRINCIPLES.flatMap((meta) => {
          const p = review.principles.find((x) => x.key === meta.key);
          if (!p?.status) return [];
          return [
            {
              key: meta.key,
              label: meta.trajectoryLabel,
              status: p.status,
            },
          ];
        })
      : [];

    result.push({
      weekStart: cursor,
      isCurrent: cursor === currentWeekStart,
      statusLabel,
      actionLabel,
      preview,
      principleLines,
    });

    cursor = addWeeks(cursor, 1);
  }

  return result.reverse();
}

function buildPreview(review: WeeklyReviewSummary): string | null {
  if (review.nextWeekJose.trim()) {
    return `“${review.nextWeekJose.trim()}”`;
  }
  if (review.alignmentReason.trim()) {
    return review.alignmentReason.trim();
  }
  if (review.alignmentScore !== null) {
    return `Alignment: ${review.alignmentScore}/5`;
  }
  return null;
}
