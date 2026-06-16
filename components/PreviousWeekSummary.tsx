import Link from "next/link";
import { ViewPageHeader } from "@/components/ViewPageHeader";
import { PRINCIPLES, statusEmoji } from "@/lib/principles";
import type { WeeklyReviewSummary } from "@/lib/reviews";
import { formatWeekLabel } from "@/lib/week";

export function PreviousWeekSummary({
  review,
}: {
  review: WeeklyReviewSummary;
}) {
  return (
    <section className="border-t border-line-subtle pt-10">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
        Last week
      </p>
      <h2 className="mt-1 font-serif text-2xl text-ink">
        {formatWeekLabel(review.weekStart)}
        {review.isComplete ? " ✓" : ""}
      </h2>

      {review.alignmentScore !== null && (
        <p className="mt-4 font-serif text-base italic text-ink-soft">
          Alignment: {review.alignmentScore}/5
          {review.alignmentReason && (
            <span className="not-italic text-ink-faint">
              {" "}
              — {review.alignmentReason}
            </span>
          )}
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-1.5">
        {PRINCIPLES.map((meta) => {
          const p = review.principles.find((x) => x.key === meta.key);
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

      {review.nextWeekJose && (
        <p className="mt-6 font-serif text-sm italic text-ink-soft">
          &ldquo;{review.nextWeekJose}&rdquo;
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
