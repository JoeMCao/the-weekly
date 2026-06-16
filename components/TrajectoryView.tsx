import Link from "next/link";
import { ViewPageHeader } from "@/components/ViewPageHeader";
import { PRINCIPLES, statusEmoji } from "@/lib/principles";
import type { WeeklyReviewSummary } from "@/lib/reviews";
import { formatWeekLabel } from "@/lib/week";

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
            Patterns over time. No scores. No dashboards. Just honesty.
          </p>
        }
      />

      <ul className="mt-12 flex flex-col gap-10">
        {weeks.map((week) => (
          <li key={week.weekStart}>
            <div className="flex items-baseline gap-3">
              <Link
                href={`/review?week=${week.weekStart}`}
                className="font-serif text-xl text-ink transition-colors hover:text-ink-soft"
              >
                {formatWeekLabel(week.weekStart)}
              </Link>
              <span className="text-ink-faint" aria-hidden>
                {week.isComplete ? "✅" : "⬜"}
              </span>
            </div>

            {week.hasContent && (
              <ul className="mt-3 flex flex-col gap-1">
                {PRINCIPLES.map((meta) => {
                  const p = week.principles.find((x) => x.key === meta.key);
                  if (!p?.status) return null;
                  return (
                    <li
                      key={meta.key}
                      className="text-sm text-ink-soft"
                    >
                      {statusEmoji(p.status)} {meta.trajectoryLabel}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {weeks.length === 0 && (
        <p className="mt-12 font-serif text-base italic text-ink-faint">
          No reviews yet. Start this week&apos;s review to begin your trajectory.
        </p>
      )}
    </section>
  );
}

type TrajectoryWeek = {
  weekStart: string;
  isComplete: boolean;
  hasContent: boolean;
  principles: WeeklyReviewSummary["principles"];
};

function buildTrajectoryWeeks(
  reviews: WeeklyReviewSummary[],
  currentWeekStart: string,
): TrajectoryWeek[] {
  const byWeek = new Map(reviews.map((r) => [r.weekStart, r]));
  const allStarts = new Set(reviews.map((r) => r.weekStart));
  allStarts.add(currentWeekStart);

  const sorted = [...allStarts].sort();
  const earliest = sorted[0];
  if (!earliest) return [];

  const result: TrajectoryWeek[] = [];
  let cursor = earliest;

  while (cursor <= currentWeekStart) {
    const review = byWeek.get(cursor);
    result.push({
      weekStart: cursor,
      isComplete: review?.isComplete ?? false,
      hasContent: Boolean(review),
      principles: review?.principles ?? [],
    });
    const [y, m, d] = cursor.split("-").map(Number);
    const next = new Date(y, (m ?? 1) - 1, (d ?? 1) + 7);
    const pad = (n: number) => String(n).padStart(2, "0");
    cursor = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
  }

  return result.reverse();
}
