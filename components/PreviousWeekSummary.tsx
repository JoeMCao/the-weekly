import Link from "next/link";
import { PRINCIPLES, statusEmoji } from "@/lib/principles";
import type { WeeklyReviewSummary } from "@/lib/reviews";
import { formatWeekRangeShort } from "@/lib/week";

export function PreviousWeekSummary({
  review,
}: {
  review: WeeklyReviewSummary;
}) {
  const { weeklyReflection } = review;

  return (
    <section className="border-t border-line-subtle pt-10">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
        Last week
      </p>
      <h2 className="mt-1 font-serif text-2xl text-ink">
        {formatWeekRangeShort(review.weekStart)}
        {review.isComplete ? " ✓" : ""}
      </h2>

      {weeklyReflection.theme && (
        <p className="mt-4 font-serif text-base italic text-ink-soft">
          {weeklyReflection.theme}
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-1.5">
        {PRINCIPLES.map((meta) => {
          const p = review.principles.find((x) => x.key === meta.key);
          if (!p?.status) return null;
          return (
            <li key={meta.key} className="text-sm text-ink-soft">
              {statusEmoji(p.status)} {meta.trajectoryLabel}
            </li>
          );
        })}
      </ul>

      {weeklyReflection.nextWeekCommitments.some((c) => c.text.trim()) && (
        <p className="mt-6 font-serif text-sm italic text-ink-soft">
          Next:{" "}
          {weeklyReflection.nextWeekCommitments
            .filter((c) => c.text.trim())
            .map((c) => c.text.trim())
            .join(" · ")}
        </p>
      )}

      <Link
        href="/trajectory"
        className="mt-6 inline-block text-sm text-ink-faint transition-colors hover:text-ink-soft"
      >
        View trajectory →
      </Link>
    </section>
  );
}
