// Lista magazynów (/magazyny) z podsumowaniem stanów i wartości.
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Magazyny" };

export default async function WarehousesPage() {
  const warehouses = await prisma.warehouse.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { stock: { include: { product: { select: { purchasePrice: true } } } } },
  });

  return (
    <>
      <PageHeader
        title="Magazyny"
        description="Miejsca, w których przechowujesz towar."
        actions={
          <ButtonLink href="/magazyny/nowy">
            <Plus className="size-4" /> Dodaj magazyn
          </ButtonLink>
        }
      />

      {warehouses.length === 0 ? (
        <EmptyState title="Nie masz jeszcze magazynów">Dodaj pierwszy magazyn.</EmptyState>
      ) : (
        // Siatka: 1 / 2 / 3 kolumny
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {warehouses.map((w) => {
            const positions = w.stock.filter((s) => s.quantity > 0).length;
            const units = w.stock.reduce((sum, s) => sum + s.quantity, 0);
            const value = w.stock.reduce((sum, s) => sum + s.quantity * s.product.purchasePrice, 0);

            return (
              <Link
                key={w.id}
                href={`/magazyny/${w.id}`}
                className="group rounded-card border border-line bg-surface p-5 transition hover:border-brand/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold group-hover:text-brand-light">{w.name}</p>
                    <p className="text-sm text-muted">{w.code}</p>
                  </div>
                  {w.isDefault && <Badge tone="brand">domyślny</Badge>}
                </div>
                {w.address && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                    <MapPin className="size-4" /> {w.address}
                  </p>
                )}
                <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Produkty</dt>
                    <dd className="font-semibold">{positions}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Sztuk</dt>
                    <dd className="font-semibold">{units}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Wartość</dt>
                    <dd className="font-semibold">{formatMoney(value)}</dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
