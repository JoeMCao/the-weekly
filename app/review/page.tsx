import { notFound } from "next/navigation";
import { DailyNotesSection } from "@/components/DailyNotesSection";
import { SectionHeader } from "@/components/SectionHeader";
import { WeekWorkspaceHeader } from "@/components/WeekWorkspaceHeader";
import { WeeklyReviewForm } from "@/components/WeeklyReviewForm";
import { getDailyNotesForWeek } from "@/lib/daily-notes";
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
import { weekStartKeyFromDateKey } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  if (!getRequestTimeZone()) {
    return (
      <section className="flex flex-col gap-6">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
          This Week
        </p>
        <h1 className="font-serif text-3xl tracking-tight text-ink">
          Syncing your local week…
        </h1>
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

  const [review, dailyNotes] = await Promise.all([
    getReviewForWeek(weekStart, today),
    getDailyNotesForWeek(weekStart),
  ]);

  if (!review) notFound();

  const isCurrentWeek = weekStart === currentWeek;
  const isPastWeek = weekStart < currentWeek;

  return (
    <section className="flex flex-col gap-12 sm:gap-14">
      <WeekWorkspaceHeader
        review={review}
        weekStart={weekStart}
        isCurrentWeek={isCurrentWeek}
      />

      {isPastWeek && !reviewHasSubstance(review) && (
        <p className="-mt-6 text-sm text-ink-faint">
          This week wasn&apos;t reviewed yet. Fill it in now.
        </p>
      )}

      <WeeklyReviewForm
        review={review}
        defaultReviewDate={today}
        isComplete={review.isComplete}
        previousCommitmentsStale={review.previousCommitmentsStale}
        dailyNotesSlot={
          <>
            <SectionHeader
              eyebrow="Daily Notes"
              subtitle="Capture what is happening while it is happening."
            />
            <DailyNotesSection
              weekStart={weekStart}
              notes={dailyNotes}
              today={today}
              isCurrentWeek={isCurrentWeek}
            />
          </>
        }
      />
    </section>
  );
}
