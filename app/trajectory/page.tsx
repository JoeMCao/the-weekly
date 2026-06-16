import { TrajectoryView } from "@/components/TrajectoryView";
import { ViewPageHeader } from "@/components/ViewPageHeader";
import { getCompletedReviews } from "@/lib/reviews";
import {
  getRequestTimeZone,
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
  const reviews = await getCompletedReviews();

  return (
    <TrajectoryView reviews={reviews} currentWeekStart={weekStart} />
  );
}
