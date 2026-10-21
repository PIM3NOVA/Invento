// Szczegóły i edycja produktu (/produkty/[id])
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney } from "@/lib/format";
import { MOVEMENT } from "@/lib/labels";
import { Badge, Card, CardTitle, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Produkt" };

export default async function ProductPage({ params }: PageProps<"/produkty/[id]">) {
  const { id } = await params;

  const [product, categories, warehouses] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stock: { include: { warehouse: true } },
        movements: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { warehouse: true, targetWarehouse: true },
        },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound(); // 404

  const totalQty = product.stock.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <>
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku}${product.ean ? ` · EAN: ${product.ean}` : ""}`}
        actions={
          <ButtonLink href={`/ruchy/nowy?produkt=${product.id}`} variant="secondary">
            Przyjmij / wydaj towar
          </ButtonLink>
        }
      />

      {/* Formularz (2/3) oraz stany i historia ruchów (1/3) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductForm
            product={product}
            categoryName={product.category?.name}
            categories={categories.map((c) => c.name)}
            warehouses={warehouses}
          />
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardTitle>Stany magazynowe</CardTitle>
            <ul className="flex flex-col gap-2">
              {warehouses.map((w) => {
                const qty = product.stock.find((s) => s.warehouseId === w.id)?.quantity ?? 0;
                return (
                  <li key={w.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
                    <span>{w.name}</span>
                    <span className="font-semibold tabular-nums">
                      {qty} {product.unit}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
              <span className="text-muted">Razem</span>
              <span className="font-semibold">
                {totalQty} {product.unit}{" "}
                {totalQty <= product.minStock && <Badge tone="danger">niski stan</Badge>}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">Wartość (cena zakupu)</span>
              <span>{formatMoney(totalQty * product.purchasePrice)}</span>
            </div>
          </Card>

          <Card>
            <CardTitle>Ostatnie ruchy</CardTitle>
            {product.movements.length === 0 ? (
              <p className="text-sm text-muted">Brak ruchów magazynowych.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {product.movements.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <Badge tone={MOVEMENT[m.type].tone}>{MOVEMENT[m.type].code}</Badge>{" "}
                      <span className="text-muted">{m.documentNo}</span>
                      <p className="mt-1 text-xs text-muted">
                        {formatDateTime(m.createdAt)} · {m.warehouse.name}
                        {m.targetWarehouse && ` → ${m.targetWarehouse.name}`}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {m.type === "OUT" ? `−${m.quantity}` : m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
