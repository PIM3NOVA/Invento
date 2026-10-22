// Arkusz spisu (/inwentaryzacja/[id]): stan systemowy, ilość policzona, różnica.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { INVENTORY_STATUS } from "@/lib/labels";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { saveInventory } from "../actions";
import { CountInput } from "./count-input";

export const metadata: Metadata = { title: "Arkusz spisu" };

export default async function InventoryCountPage({ params }: PageProps<"/inwentaryzacja/[id]">) {
  const { id } = await params;

  const count = await prisma.inventoryCount.findUnique({
    where: { id },
    include: {
      warehouse: true,
      items: { include: { product: true }, orderBy: { product: { name: "asc" } } },
    },
  });
  if (!count) notFound();

  const isClosed = count.status === "CLOSED";
  const countedItems = count.items.filter((i) => i.countedQty !== null);
  const differences = countedItems.filter((i) => i.countedQty !== i.expectedQty).length;

  return (
    <>
      <PageHeader
        title={`Spis ${count.number}`}
        description={`${count.warehouse.name} · rozpoczęty ${formatDateTime(count.createdAt)}${
          count.closedAt ? ` · zamknięty ${formatDateTime(count.closedAt)}` : ""
        }`}
        actions={<Badge tone={INVENTORY_STATUS[count.status].tone}>{INVENTORY_STATUS[count.status].label}</Badge>}
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Summary label="Pozycji" value={count.items.length} />
        <Summary label="Policzono" value={countedItems.length} />
        <Summary label="Różnice" value={differences} highlight={differences > 0} />
      </div>

      <ActionForm action={saveInventory.bind(null, count.id)}>
        <Card className="p-0 md:p-0">
          {/* Nagłówki kolumn (desktop) */}
          <div className="hidden grid-cols-[1fr_8rem_11rem] gap-4 border-b border-line px-6 py-3 text-sm text-muted md:grid">
            <span>Produkt</span>
            <span className="text-right">Stan w systemie</span>
            <span>Policzono / różnica</span>
          </div>
          <ul>
            {count.items.map((item) => (
              // mobile: układ dwuwierszowy, desktop: jeden wiersz
              <li
                key={item.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-line/60 px-4 py-3 last:border-0 md:grid-cols-[1fr_8rem_11rem] md:px-6"
              >
                <div className="col-span-2 min-w-0 md:col-span-1">
                  <p className="truncate font-medium">{item.product.name}</p>
                  <p className="text-xs text-muted">{item.product.sku}</p>
                </div>
                <p className="text-sm text-muted md:text-right md:text-base md:text-fg">
                  <span className="md:hidden">W systemie: </span>
                  {item.expectedQty} {item.product.unit}
                </p>
                <CountInput
                  name={`counted_${item.id}`}
                  expected={item.expectedQty}
                  defaultValue={item.countedQty}
                  disabled={isClosed}
                />
              </li>
            ))}
          </ul>
        </Card>

        {!isClosed && (
          // mobile: przyciski przypięte nad dolnym paskiem
          <div className="sticky bottom-20 z-10 flex flex-col gap-2 rounded-card border border-line bg-surface/95 p-3 backdrop-blur md:static md:flex-row md:justify-end md:border-0 md:bg-transparent md:p-0">
            <SubmitButton variant="secondary" name="intent" value="save">
              Zapisz postęp
            </SubmitButton>
            <SubmitButton
              name="intent"
              value="close"
              pendingText="Księgowanie…"
              confirm="Zamknąć spis? Różnice zostaną zaksięgowane jako korekty i spisu nie będzie można edytować."
            >
              Zamknij spis i wyrównaj stany
            </SubmitButton>
          </div>
        )}
      </ActionForm>
    </>
  );
}

function Summary({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-card border border-line bg-surface p-3 text-center md:p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-xl font-semibold ${highlight ? "text-warning" : ""}`}>{value}</p>
    </div>
  );
}
