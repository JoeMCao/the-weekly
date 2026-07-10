import Link from "next/link";
import { PreviousWeekSummary } from "@/components/PreviousWeekSummary";
import { ViewPageHeader } from "@/components/ViewPageHeader";
import { getPreviousWeekReview, getReviewForWeek, ensureWeekCalendar, reviewHasSubstance } from "@/lib/reviews";
import {
  getRequestTimeZone,
  todayKeyForRequest,
  weekStartKeyForRequest,
} from "@/lib/request-time-zone";
import { formatWeekLong } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!getRequestTimeZone()) {
    return (
      <section className="flex flex-col gap-6">
        <ViewPageHeader
          eyebrow="Weekly Compass"
          title="Syncing your local week..."
          dek={
            <p>
              Waiting for your browser&apos;s timezone so we open the correct
              week.
            </p>
          }
        />
      </section>
    );
  }

  const weekStart = weekStartKeyForRequest();
  const today = todayKeyForRequest();
  await ensureWeekCalendar(weekStart, today);
  const currentReview = await getReviewForWeek(weekStart, today);
  const previousReview = await getPreviousWeekReview(weekStart, today);
  const hasStarted = currentReview ? reviewHasSubstance(currentReview) : false;

  return (
    <section className="flex flex-col">
      <ViewPageHeader
        eyebrow="Weekly Compass"
        title="Am I becoming the person I want to become?"
        dek={
          <p className="not-italic text-sm normal-case tracking-normal text-ink-faint">
            {formatWeekLong(weekStart)}
          </p>
        }
      />

      <div className="mt-10 sm:mt-12">
        <Link
          href="/review"
          className="inline-flex items-center rounded-xl border border-ink/10 bg-ink px-6 py-3 text-sm font-medium tracking-wide text-paper transition-opacity hover:opacity-90"
        >
          {hasStarted ? "Continue This Week's Review" : "Start This Week's Review"}
        </Link>
      </div>

      {previousReview && (
        <div className="mt-16">
          <PreviousWeekSummary review={previousReview} />
        </div>
      )}
    </section>
  );
}
