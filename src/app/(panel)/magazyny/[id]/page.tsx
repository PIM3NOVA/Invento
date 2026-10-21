// Szczegóły magazynu (/magazyny/[id]): edycja danych i stany produktów
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { Badge, CardTitle, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { WarehouseForm } from "../warehouse-form";

export const metadata: Metadata = { title: "Magazyn" };

export default async function WarehousePage({ params }: PageProps<"/magazyny/[id]">) {
  const { id } = await params;

  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: {
      stock: {
        where: { quantity: { not: 0 } },
        include: { product: true },
        orderBy: { product: { name: "asc" } },
      },
    },
  });
  if (!warehouse) notFound();

  return (
    <>
      <PageHeader
        title={warehouse.name}
        description={warehouse.code}
        actions={
          <ButtonLink href={`/inwentaryzacja?magazyn=${warehouse.id}`} variant="secondary">
            Rozpocznij inwentaryzację
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <WarehouseForm warehouse={warehouse} />
        </div>

        <div className="lg:col-span-3">
          <CardTitle>Towar na stanie</CardTitle>
          {warehouse.stock.length === 0 ? (
            <EmptyState title="Magazyn jest pusty" />
          ) : (
            <DataTable
              rows={warehouse.stock}
              getKey={(s) => s.productId}
              href={(s) => `/produkty/${s.productId}`}
              columns={[
                { header: "Produkt", cell: (s) => s.product.name },
                { header: "SKU", cell: (s) => s.product.sku },
                {
                  header: "Ilość",
                  align: "right",
                  cell: (s) =>
                    s.quantity <= s.product.minStock ? (
                      <Badge tone="danger">{s.quantity}</Badge>
                    ) : (
                      s.quantity
                    ),
                },
                {
                  header: "Wartość",
                  align: "right",
                  cell: (s) => formatMoney(s.quantity * s.product.purchasePrice),
                },
              ]}
            />
          )}
        </div>
      </div>
    </>
  );
}
