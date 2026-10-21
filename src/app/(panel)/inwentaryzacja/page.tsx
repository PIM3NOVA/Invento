// Inwentaryzacja (/inwentaryzacja): rozpoczęcie spisu i historia spisów.
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { INVENTORY_STATUS } from "@/lib/labels";
import { Badge, Card, CardTitle, EmptyState, PageHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Select } from "@/components/ui/form";
import { DataTable } from "@/components/ui/data-table";
import { startInventory } from "./actions";

export const metadata: Metadata = { title: "Inwentaryzacja" };

export default async function InventoryListPage({ searchParams }: PageProps<"/inwentaryzacja">) {
  const { magazyn } = await searchParams;

  const [warehouses, counts] = await Promise.all([
    prisma.warehouse.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    prisma.inventoryCount.findMany({
      include: { warehouse: true, items: { select: { expectedQty: true, countedQty: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Inwentaryzacja"
        description="Spis z natury: policz towar na półkach, a system wyrówna różnice."
      />

      <Card className="mb-6">
        <CardTitle>Rozpocznij nowy spis</CardTitle>
        <ActionForm action={startInventory} className="md:flex-row md:items-end">
          <Field label="Magazyn" className="flex-1">
            <Select name="warehouseId" defaultValue={typeof magazyn === "string" ? magazyn : undefined}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
          <SubmitButton pendingText="Tworzenie…">Rozpocznij spis</SubmitButton>
        </ActionForm>
      </Card>

      {counts.length === 0 ? (
        <EmptyState title="Nie przeprowadzono jeszcze żadnej inwentaryzacji" />
      ) : (
        <DataTable
          rows={counts}
          getKey={(c) => c.id}
          href={(c) => `/inwentaryzacja/${c.id}`}
          columns={[
            { header: "Numer", cell: (c) => c.number },
            { header: "Magazyn", cell: (c) => c.warehouse.name },
            {
              header: "Status",
              cell: (c) => <Badge tone={INVENTORY_STATUS[c.status].tone}>{INVENTORY_STATUS[c.status].label}</Badge>,
            },
            {
              header: "Policzono",
              cell: (c) => `${c.items.filter((i) => i.countedQty !== null).length} / ${c.items.length}`,
            },
            { header: "Rozpoczęto", cell: (c) => formatDateTime(c.createdAt), hideOnMobile: true },
          ]}
        />
      )}
    </>
  );
}
