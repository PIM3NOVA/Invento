// Wykres słupkowy sprzedaży (HTML/CSS); wysokość słupka proporcjonalna do maksimum.
import { formatMoney } from "@/lib/format";

export function SalesChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1); // min. 1 – ochrona przed dzieleniem przez zero

  return (
    <div>
      <div className="flex h-48 items-end gap-1 md:h-56 md:gap-2">
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
            {/* Tooltip z kwotą */}
            <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs whitespace-nowrap group-hover:block">
              {formatMoney(d.value)}
            </span>
            <div
              className="rounded-t-md bg-brand/80 transition-colors group-hover:bg-brand"
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 1)}%` }}
            />
          </div>
        ))}
      </div>
      {/* Etykiety dni – w widoku mobilnym co druga */}
      <div className="mt-2 flex gap-1 md:gap-2">
        {data.map((d, i) => (
          <span key={d.label} className={`flex-1 text-center text-[10px] text-muted md:text-xs ${i % 2 ? "invisible md:visible" : ""}`}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
