// Tabela responsywna: tabela na desktopie (md+), lista kart na urządzeniach mobilnych.
// Kolumny definiowane funkcjami renderującymi `cell`; opcjonalny `href` czyni wiersz klikalnym.
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  hideOnMobile?: boolean; // kolumna ukryta w widoku mobilnym
};

export function DataTable<T>({
  rows,
  columns,
  getKey,
  href,
}: {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
  href?: (row: T) => string;
}) {
  // Pierwsza kolumna pełni rolę tytułu karty w widoku mobilnym
  const [titleColumn, ...detailColumns] = columns;

  return (
    <>
      {/* Widok desktop */}
      <div className="hidden overflow-hidden rounded-card border border-line bg-surface md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={`px-5 py-3.5 font-medium ${col.align === "right" ? "text-right" : ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              // link rozciągnięty na cały wiersz (after:inset-0)
              <tr
                key={getKey(row)}
                className="relative border-b border-line/60 last:border-0 transition-colors hover:bg-surface-2"
              >
                {columns.map((col, i) => (
                  <td
                    key={col.header}
                    className={`px-5 py-3.5 ${col.align === "right" ? "text-right tabular-nums" : ""}`}
                  >
                    {i === 0 && href ? (
                      <Link href={href(row)} className="font-medium after:absolute after:inset-0">
                        {col.cell(row)}
                      </Link>
                    ) : (
                      col.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Widok mobilny */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => {
          const content = (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 font-medium">{titleColumn.cell(row)}</div>
                {href && <ChevronRight className="size-5 shrink-0 text-muted" />}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {detailColumns
                  .filter((col) => !col.hideOnMobile)
                  .map((col) => (
                    <div key={col.header} className="min-w-0">
                      <dt className="text-xs text-muted">{col.header}</dt>
                      <dd className="truncate tabular-nums">{col.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
            </>
          );

          const cardClass =
            "block rounded-card border border-line bg-surface p-4 active:bg-surface-2";

          return (
            <li key={getKey(row)}>
              {href ? (
                <Link href={href(row)} className={cardClass}>
                  {content}
                </Link>
              ) : (
                <div className={cardClass}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
