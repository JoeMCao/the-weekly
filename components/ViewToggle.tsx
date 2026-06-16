"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const VIEWS = [
  { href: "/", label: "Home" },
  { href: "/review", label: "This Week" },
  { href: "/trajectory", label: "Trajectory" },
] as const;

function segmentActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function ViewToggle() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="View"
      className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm sm:gap-x-6"
    >
      {VIEWS.map((v) => {
        const active = segmentActive(pathname, v.href);
        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={active ? "page" : undefined}
            className={[
              "shrink-0 rounded-sm py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/15",
              active
                ? "font-medium text-ink"
                : "font-normal text-ink-faint hover:text-ink-soft",
            ].join(" ")}
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
