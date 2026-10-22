// Lista produktów (/produkty); filtry przekazywane w URL: ?q=...&kategoria=...
import type { Metadata } from "next";
import Form from "next/form";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatMoney, plural } from "@/lib/format";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink, Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { DataTable } from "@/components/ui/data-table";

export const metadata: Metadata = { title: "Produkty" };

export default async function ProductsPage({ searchParams }: PageProps<"/produkty">) {
  const { q, kategoria } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const categoryId = typeof kategoria === "string" ? kategoria : "";

  // Zapytania wykonywane równolegle
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        // wyszukiwanie po nazwie, SKU lub EAN (bez rozróżniania wielkości liter)
        ...(query && {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { ean: { contains: query } },
          ],
        }),
        ...(categoryId && { categoryId }),
      },
      include: { category: true, stock: true },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Suma stanów ze wszystkich magazynów
  const rows = products.map((p) => ({
    ...p,
    totalQty: p.stock.reduce((sum, s) => sum + s.quantity, 0),
  }));

  return (
    <>
      <PageHeader
        title="Produkty"
        description={`${plural(products.length, ["pozycja", "pozycje", "pozycji"])} w katalogu`}
        actions={
          <ButtonLink href="/produkty/nowy">
            <Plus className="size-4" /> Dodaj produkt
          </ButtonLink>
        }
      />

      {/* Wyszukiwanie (next/form – nawigacja bez przeładowania strony) */}
      <Form action="/produkty" className="mb-5 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={query} placeholder="Szukaj po nazwie, SKU lub EAN…" className="pl-11" aria-label="Szukaj produktu" />
        </div>
        <Select name="kategoria" defaultValue={categoryId} className="md:w-56" aria-label="Kategoria">
          <option value="">Wszystkie kategorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filtruj
        </Button>
      </Form>

      {rows.length === 0 ? (
        <EmptyState title="Brak produktów">
          {query ? "Nic nie pasuje do wyszukiwania." : "Dodaj pierwszy produkt, aby zacząć."}
        </EmptyState>
      ) : (
        <DataTable
          rows={rows}
          getKey={(p) => p.id}
          href={(p) => `/produkty/${p.id}`}
          columns={[
            {
              header: "Produkt",
              cell: (p) => (
                <span className={p.isActive ? "" : "text-muted line-through"}>{p.name}</span>
              ),
            },
            { header: "SKU", cell: (p) => <span className="text-muted">{p.sku}</span> },
            { header: "Kategoria", cell: (p) => p.category?.name ?? "—", hideOnMobile: true },
            { header: "Cena netto", cell: (p) => formatMoney(p.priceNet), align: "right" },
            {
              header: "Stan",
              align: "right",
              cell: (p) =>
                p.totalQty <= p.minStock ? (
                  <Badge tone="danger">
                    {p.totalQty} {p.unit}
                  </Badge>
                ) : (
                  `${p.totalQty} ${p.unit}`
                ),
            },
          ]}
        />
      )}
    </>
  );
}
