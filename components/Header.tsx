import Link from "next/link";
import { ViewToggle } from "@/components/ViewToggle";

export function Header() {
  return (
    <header className="flex flex-col gap-3 pt-8 sm:pt-10">
      <Link
        href="/"
        className="group inline-flex items-baseline gap-2 self-start"
      >
        <span className="font-serif text-2xl tracking-tight text-ink">
          Weekly Compass
        </span>
      </Link>
      <ViewToggle />
    </header>
  );
}
