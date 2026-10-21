// Historia ruchów magazynowych (/ruchy); filtr: ?typ=IN|OUT|TRANSFER|ADJUST
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import type { MovementType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { MOVEMENT } from "@/lib/labels";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { FilterBar, FilterChip } from "@/components/ui/filter-chip";

export const metadata: Metadata = { title: "Ruchy magazynowe" };

const TYPES = Object.keys(MOVEMENT) as MovementType[];

export default async function MovementsPage({ searchParams }: PageProps<"/ruchy">) {
  const { typ } = await searchParams;
  const type = TYPES.find((t) => t === typ);

  const movements = await prisma.stockMovement.findMany({
    where: type ? { type } : undefined,
    include: { product: true, warehouse: true, targetWarehouse: true, order: true },
    orderBy: { createdAt: "desc" },
    take: 200, // limit wyświetlanych rekordów
  });

  return (
    <>
      <PageHeader
        title="Ruchy magazynowe"
        description="Historia przyjęć, wydań, przesunięć i korekt."
        actions={
          <ButtonLink href="/ruchy/nowy">
            <Plus className="size-4" /> Nowy dokument
          </ButtonLink>
        }
      />

      <FilterBar>
        <FilterChip href="/ruchy" active={!type}>
          Wszystkie
        </FilterChip>
        {TYPES.map((t) => (
          <FilterChip key={t} href={`/ruchy?typ=${t}`} active={type === t}>
            {MOVEMENT[t].code} · {MOVEMENT[t].label}
          </FilterChip>
        ))}
      </FilterBar>

      {movements.length === 0 ? (
        <EmptyState title="Brak ruchów magazynowych" />
      ) : (
        <DataTable
          rows={movements}
          getKey={(m) => m.id}
          href={(m) => `/produkty/${m.productId}`}
          columns={[
            { header: "Produkt", cell: (m) => m.product.name },
            {
              header: "Dokument",
              cell: (m) => <Badge tone={MOVEMENT[m.type].tone}>{m.documentNo}</Badge>,
            },
            {
              header: "Magazyn",
              cell: (m) => (m.targetWarehouse ? `${m.warehouse.name} → ${m.targetWarehouse.name}` : m.warehouse.name),
            },
            {
              header: "Ilość",
              align: "right",
              cell: (m) => (m.type === "OUT" ? `−${m.quantity}` : m.quantity > 0 ? `+${m.quantity}` : m.quantity),
            },
            { header: "Data", cell: (m) => formatDateTime(m.createdAt) },
            {
              header: "Uwagi",
              hideOnMobile: true,
              cell: (m) => (m.order ? `Zamówienie ${m.order.number}` : (m.note ?? "—")),
            },
          ]}
        />
      )}
    </>
  );
}
