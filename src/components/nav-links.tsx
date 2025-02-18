"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/board", label: "Board" },
  { href: "/applications", label: "Table" },
  { href: "/reminders", label: "Reminders" },
  { href: "/stats", label: "Stats" },
];

export function NavLinks({ reminderCount }: { reminderCount: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="order-last flex w-full items-center gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto"
    >
      {LINKS.map((link) => {
        const active =
          pathname === link.href || (link.href === "/applications" && pathname.startsWith("/applications/"));
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-2.5 py-1.5 font-medium ${active ? "bg-stone-100 text-ink" : "text-muted hover:text-ink"}`}
          >
            {link.label}
            {link.href === "/reminders" && reminderCount > 0 && (
              <span className="ml-1.5 rounded-full bg-interview px-1.5 py-0.5 text-xs text-white">
                {reminderCount}
                <span className="sr-only"> due</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
