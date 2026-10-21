// Filtry w postaci linków; w widoku mobilnym pasek przewijany poziomo.
import Link from "next/link";
import type { ReactNode } from "react";

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">{children}</div>;
}

export function FilterChip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm whitespace-nowrap ${
        active ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-fg"
      }`}
    >
      {children}
    </Link>
  );
}
