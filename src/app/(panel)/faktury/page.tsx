// Lista faktur (/faktury); filtr: ?filtr=oplacone|nieoplacone
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { FilterBar, FilterChip } from "@/components/ui/filter-chip";

export const metadata: Metadata = { title: "Faktury" };

export default async function InvoicesPage({ searchParams }: PageProps<"/faktury">) {
  const { filtr } = await searchParams;
  const paidFilter = filtr === "oplacone" ? true : filtr === "nieoplacone" ? false : undefined;

  const invoices = await prisma.invoice.findMany({
    where: paidFilter === undefined ? undefined : { isPaid: paidFilter },
    orderBy: { issueDate: "desc" },
    take: 200,
  });

  const now = new Date();

  return (
    <>
      <PageHeader
        title="Faktury"
        description="Faktury VAT wystawiasz z poziomu zamówienia – przycisk „Wystaw fakturę VAT”."
      />

      <FilterBar>
        <FilterChip href="/faktury" active={paidFilter === undefined}>
          Wszystkie
        </FilterChip>
        <FilterChip href="/faktury?filtr=nieoplacone" active={paidFilter === false}>
          Nieopłacone
        </FilterChip>
        <FilterChip href="/faktury?filtr=oplacone" active={paidFilter === true}>
          Opłacone
        </FilterChip>
      </FilterBar>

      {invoices.length === 0 ? (
        <EmptyState title="Brak faktur" />
      ) : (
        <DataTable
          rows={invoices}
          getKey={(i) => i.id}
          href={(i) => `/faktury/${i.id}`}
          columns={[
            { header: "Numer", cell: (i) => i.number },
            { header: "Nabywca", cell: (i) => i.buyerName },
            { header: "Wystawiona", cell: (i) => formatDate(i.issueDate), hideOnMobile: true },
            {
              header: "Status",
              cell: (i) =>
                i.isPaid ? (
                  <Badge tone="success">Opłacona</Badge>
                ) : i.dueDate < now ? (
                  <Badge tone="danger">Po terminie</Badge>
                ) : (
                  <Badge tone="warning">Do {formatDate(i.dueDate)}</Badge>
                ),
            },
            { header: "Brutto", align: "right", cell: (i) => formatMoney(i.totalGross) },
          ]}
        />
      )}
    </>
  );
}
