import { countCompletedCommitments } from "@/lib/commitments";
import type { WeeklyReviewSummary } from "@/lib/reviews";
import { formatWeekRangeShort } from "@/lib/week";

export function WeekWorkspaceHeader({
  review,
  weekStart,
  isCurrentWeek,
}: {
  review: WeeklyReviewSummary;
  weekStart: string;
  isCurrentWeek: boolean;
}) {
  const { checked, total } = countCompletedCommitments(
    review.previousCommitments,
  );

  return (
    <header className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
        {isCurrentWeek ? "This Week" : "Week"}
      </p>
      <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">
        {formatWeekRangeShort(weekStart)}
      </h1>
      {total > 0 && (
        <p className="text-sm text-ink-faint">
          {checked} of {total} commitments checked
        </p>
      )}
    </header>
  );
}
