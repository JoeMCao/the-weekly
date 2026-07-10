import { TrajectoryView } from "@/components/TrajectoryView";
import { ViewPageHeader } from "@/components/ViewPageHeader";
import { ensureWeekCalendar, getAllReviews } from "@/lib/reviews";
import {
  getRequestTimeZone,
  todayKeyForRequest,
  weekStartKeyForRequest,
} from "@/lib/request-time-zone";

export const dynamic = "force-dynamic";

export default async function TrajectoryPage() {
  if (!getRequestTimeZone()) {
    return (
      <ViewPageHeader
        eyebrow="Trajectory"
        title="Syncing your local week..."
      />
    );
  }

  const weekStart = weekStartKeyForRequest();
  await ensureWeekCalendar(weekStart, todayKeyForRequest());
  const reviews = await getAllReviews();

  return (
    <TrajectoryView reviews={reviews} currentWeekStart={weekStart} />
  );
}
