// Szczegóły kontrahenta (/kontrahenci/[id]): edycja i historia zamówień
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/labels";
import { Badge, CardTitle, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "Kontrahent" };

export default async function CustomerPage({ params }: PageProps<"/kontrahenci/[id]">) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { orders: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title={customer.name}
        description={customer.nip ? `NIP ${customer.nip}` : "Osoba prywatna"}
        actions={<ButtonLink href={`/zamowienia/nowe?klient=${customer.id}`}>Nowe zamówienie</ButtonLink>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <CustomerForm customer={customer} />
        <div>
          <CardTitle>Zamówienia klienta</CardTitle>
          {customer.orders.length === 0 ? (
            <EmptyState title="Brak zamówień" />
          ) : (
            <DataTable
              rows={customer.orders}
              getKey={(o) => o.id}
              href={(o) => `/zamowienia/${o.id}`}
              columns={[
                { header: "Numer", cell: (o) => o.number },
                { header: "Data", cell: (o) => formatDate(o.createdAt) },
                {
                  header: "Status",
                  cell: (o) => <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>,
                },
              ]}
            />
          )}
        </div>
      </div>
    </>
  );
}
