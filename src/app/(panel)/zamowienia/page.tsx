// Lista zamówień (/zamowienia); filtr: ?status=
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import type { OrderStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { calcTotals } from "@/lib/invoice-math";
import { CHANNEL, ORDER_STATUS } from "@/lib/labels";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { FilterBar, FilterChip } from "@/components/ui/filter-chip";

export const metadata: Metadata = { title: "Zamówienia" };

const STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];

export default async function OrdersPage({ searchParams }: PageProps<"/zamowienia">) {
  const { status: statusParam } = await searchParams;
  const status = STATUSES.find((s) => s === statusParam);

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where: status ? { status } : undefined,
      include: { customer: true, items: true, invoice: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    // liczba zamówień w poszczególnych statusach
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (s: OrderStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader
        title="Zamówienia"
        description="Wszystkie zamówienia ze wszystkich kanałów sprzedaży w jednym miejscu."
        actions={
          <ButtonLink href="/zamowienia/nowe">
            <Plus className="size-4" /> Nowe zamówienie
          </ButtonLink>
        }
      />

      <FilterBar>
        <FilterChip href="/zamowienia" active={!status}>
          Wszystkie
        </FilterChip>
        {STATUSES.map((s) => (
          <FilterChip key={s} href={`/zamowienia?status=${s}`} active={status === s}>
            {ORDER_STATUS[s].label} <span className="ml-1.5">{countOf(s)}</span>
          </FilterChip>
        ))}
      </FilterBar>

      {orders.length === 0 ? (
        <EmptyState title="Brak zamówień" />
      ) : (
        <DataTable
          rows={orders}
          getKey={(o) => o.id}
          href={(o) => `/zamowienia/${o.id}`}
          columns={[
            { header: "Numer", cell: (o) => o.number },
            { header: "Klient", cell: (o) => o.customer.name },
            {
              header: "Status",
              cell: (o) => <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>,
            },
            { header: "Kanał", cell: (o) => CHANNEL[o.channel], hideOnMobile: true },
            { header: "Data", cell: (o) => formatDate(o.createdAt) },
            { header: "Faktura", cell: (o) => (o.invoice ? "✓" : "—"), hideOnMobile: true },
            { header: "Brutto", align: "right", cell: (o) => formatMoney(calcTotals(o.items).gross) },
          ]}
        />
      )}
    </>
  );
}
