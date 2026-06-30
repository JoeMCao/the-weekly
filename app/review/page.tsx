import { notFound } from "next/navigation";
import { WeeklyReviewForm } from "@/components/WeeklyReviewForm";
import { ViewPageHeader } from "@/components/ViewPageHeader";
import { isValidDateKey } from "@/lib/date";
import { ensureReview, reviewHasSubstance } from "@/lib/reviews";
import {
  getRequestTimeZone,
  weekStartKeyForRequest,
} from "@/lib/request-time-zone";
import { formatWeekLong, weekStartKeyFromDateKey } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  if (!getRequestTimeZone()) {
    return (
      <section className="flex flex-col gap-6">
        <ViewPageHeader
          eyebrow="This Week"
          title="Syncing your local week..."
        />
      </section>
    );
  }

  const currentWeek = weekStartKeyForRequest();
  let weekStart = currentWeek;

  if (searchParams.week) {
    if (!isValidDateKey(searchParams.week)) notFound();
    weekStart = weekStartKeyFromDateKey(searchParams.week);
  }

  const review = await ensureReview(weekStart);
  const isCurrentWeek = weekStart === currentWeek;
  const isPastWeek = weekStart < currentWeek;

  return (
    <section className="flex flex-col">
      <ViewPageHeader
        eyebrow={
          isCurrentWeek ? "This Week" : isPastWeek ? "Past Week" : "Week"
        }
        title={isPastWeek && !reviewHasSubstance(review) ? "Catch up" : "Weekly Review"}
        dek={
          <p className="not-italic text-sm normal-case tracking-normal text-ink-faint">
            {formatWeekLong(weekStart)}
            {isPastWeek && !reviewHasSubstance(review) && (
              <span className="mt-1 block">
                This week wasn&apos;t reviewed yet. Fill it in now.
              </span>
            )}
          </p>
        }
      />

      <div className="mt-10 sm:mt-12">
        <WeeklyReviewForm review={review} />
      </div>
    </section>
  );
}
