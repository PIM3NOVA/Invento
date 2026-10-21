// Dodawanie produktu (/produkty/nowy)
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Nowy produkt" };

export default async function NewProductPage() {
  const [categories, warehouses] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nowy produkt" description="Uzupełnij dane i zapisz." />
      <ProductForm categories={categories.map((c) => c.name)} warehouses={warehouses} />
    </div>
  );
}
