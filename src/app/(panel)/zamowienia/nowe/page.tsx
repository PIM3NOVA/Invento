// Nowe zamówienie (/zamowienia/nowe); opcjonalnie ?klient=ID
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CHANNEL, PAYMENT } from "@/lib/labels";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, FormGrid, Select, Textarea } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { createOrder } from "../actions";
import { OrderItemsEditor } from "./order-items-editor";

export const metadata: Metadata = { title: "Nowe zamówienie" };

export default async function NewOrderPage({ searchParams }: PageProps<"/zamowienia/nowe">) {
  const { klient } = await searchParams;

  const [customers, warehouses, products] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      // tylko pola wymagane przez edytor pozycji
      select: { id: true, name: true, sku: true, unit: true, priceNet: true, vatRate: true },
    }),
  ]);

  if (customers.length === 0) {
    return (
      <EmptyState title="Najpierw dodaj kontrahenta">
        <ButtonLink href="/kontrahenci/nowy">Dodaj kontrahenta</ButtonLink>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Nowe zamówienie" />
      <ActionForm action={createOrder}>
        <Card>
          <CardTitle>Dane zamówienia</CardTitle>
          <FormGrid>
            <Field label="Klient">
              <Select name="customerId" defaultValue={typeof klient === "string" ? klient : ""} required>
                <option value="" disabled>
                  — wybierz klienta —
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.nip ? ` (NIP ${c.nip})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Wysyłka z magazynu">
              <Select name="warehouseId">
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kanał sprzedaży">
              <Select name="channel">
                {Object.entries(CHANNEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Płatność">
              <Select name="paymentMethod">
                {Object.entries(PAYMENT).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Uwagi" className="md:col-span-2">
              <Textarea name="note" placeholder="Np. prośba klienta o pakowanie na prezent" />
            </Field>
          </FormGrid>
        </Card>

        <Card>
          <CardTitle>Produkty</CardTitle>
          <OrderItemsEditor products={products} />
        </Card>

        <div className="flex justify-end">
          <SubmitButton className="w-full md:w-auto">Utwórz zamówienie</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
