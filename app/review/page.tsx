import { notFound } from "next/navigation";
import { WeeklyReviewForm } from "@/components/WeeklyReviewForm";
import { ViewPageHeader } from "@/components/ViewPageHeader";
import { isValidDateKey, type DateKey } from "@/lib/date";
import {
  ensureWeekCalendar,
  getReviewForWeek,
  reviewHasSubstance,
} from "@/lib/reviews";
import {
  getRequestTimeZone,
  todayKeyForRequest,
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
  const today = todayKeyForRequest();
  await ensureWeekCalendar(currentWeek, today);

  let weekStart = currentWeek;

  if (searchParams.week) {
    if (!isValidDateKey(searchParams.week)) notFound();
    weekStart = weekStartKeyFromDateKey(searchParams.week as DateKey);
  }

  const review = await getReviewForWeek(weekStart, today);
  if (!review) notFound();

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
        <WeeklyReviewForm
          review={review}
          defaultReviewDate={today}
          isComplete={review.isComplete}
          previousCommitmentsStale={review.previousCommitmentsStale}
        />
      </div>
    </section>
  );
}
