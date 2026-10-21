// Nowy dokument magazynowy (/ruchy/nowy); ?produkt=ID wstępnie wybiera produkt.
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { createMovement } from "../actions";

export const metadata: Metadata = { title: "Nowy dokument magazynowy" };

export default async function NewMovementPage({ searchParams }: PageProps<"/ruchy/nowy">) {
  const { produkt } = await searchParams;

  const [products, warehouses] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nowy dokument magazynowy" description="Przyjęcie, wydanie lub przesunięcie towaru." />

      <ActionForm action={createMovement}>
        <Card>
          <FormGrid>
            <Field label="Rodzaj dokumentu" className="md:col-span-2">
              <Select name="type" defaultValue="IN">
                <option value="IN">PZ – Przyjęcie towaru</option>
                <option value="OUT">WZ – Wydanie towaru</option>
                <option value="TRANSFER">MM – Przesunięcie między magazynami</option>
              </Select>
            </Field>
            <Field label="Produkt" className="md:col-span-2">
              <Select name="productId" defaultValue={typeof produkt === "string" ? produkt : ""} required>
                <option value="" disabled>
                  — wybierz produkt —
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Magazyn" hint="Dla MM: magazyn, z którego zabieramy">
              <Select name="warehouseId" required>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Magazyn docelowy" hint="Tylko dla przesunięcia MM">
              <Select name="targetWarehouseId" defaultValue="">
                <option value="">—</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ilość">
              <Input name="quantity" type="number" min={1} defaultValue={1} required inputMode="numeric" />
            </Field>
            <Field label="Uwagi" hint="Np. numer faktury od dostawcy">
              <Input name="note" />
            </Field>
          </FormGrid>
        </Card>
        <div className="flex justify-end">
          <SubmitButton className="w-full md:w-auto">Zatwierdź dokument</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
