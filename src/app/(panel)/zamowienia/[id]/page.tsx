// Szczegóły zamówienia (/zamowienia/[id]): pozycje, klient, zmiana statusu, faktura.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney } from "@/lib/format";
import { calcLine, calcTotals } from "@/lib/invoice-math";
import { CHANNEL, ORDER_STATUS, PAYMENT } from "@/lib/labels";
import { Badge, Card, CardTitle, PageHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { changeOrderStatus } from "../actions";
import { createInvoiceFromOrder } from "../../faktury/actions";

export const metadata: Metadata = { title: "Zamówienie" };

export default async function OrderPage({ params }: PageProps<"/zamowienia/[id]">) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, warehouse: true, items: { include: { product: true } }, invoice: true },
  });
  if (!order) notFound();

  const totals = calcTotals(order.items);
  const status = ORDER_STATUS[order.status];

  return (
    <>
      <PageHeader
        title={`Zamówienie ${order.number}`}
        description={`${formatDateTime(order.createdAt)} · ${CHANNEL[order.channel]}`}
        actions={<Badge tone={status.tone}>{status.label}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pozycje */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DataTable
            rows={order.items}
            getKey={(i) => i.id}
            href={(i) => `/produkty/${i.productId}`}
            columns={[
              { header: "Produkt", cell: (i) => i.name },
              { header: "Ilość", cell: (i) => `${i.quantity} ${i.product.unit}` },
              { header: "Cena netto", align: "right", cell: (i) => formatMoney(i.priceNet) },
              { header: "VAT", cell: (i) => `${i.vatRate}%`, hideOnMobile: true },
              { header: "Wartość brutto", align: "right", cell: (i) => formatMoney(calcLine(i).gross) },
            ]}
          />
          <Card>
            <dl className="ml-auto grid max-w-xs grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted">Netto</dt>
              <dd className="text-right">{formatMoney(totals.net)}</dd>
              <dt className="text-muted">VAT</dt>
              <dd className="text-right">{formatMoney(totals.vat)}</dd>
              <dt className="font-semibold">Do zapłaty</dt>
              <dd className="text-right text-lg font-semibold text-brand-light">{formatMoney(totals.gross)}</dd>
            </dl>
          </Card>
        </div>

        {/* Realizacja, klient, szczegóły */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardTitle>Realizacja</CardTitle>
            <StatusActions orderId={order.id} status={order.status} />

            <div className="mt-4 border-t border-line pt-4">
              {order.invoice ? (
                <ButtonLink href={`/faktury/${order.invoice.id}`} variant="secondary" className="w-full">
                  Zobacz fakturę {order.invoice.number}
                </ButtonLink>
              ) : order.status !== "CANCELLED" ? (
                <ActionForm action={createInvoiceFromOrder.bind(null, order.id)}>
                  <SubmitButton variant="secondary" pendingText="Wystawianie…" className="w-full">
                    Wystaw fakturę VAT
                  </SubmitButton>
                </ActionForm>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardTitle>Klient</CardTitle>
            <Link href={`/kontrahenci/${order.customer.id}`} className="font-medium hover:text-brand-light">
              {order.customer.name}
            </Link>
            <p className="mt-1 text-sm text-muted">
              {order.customer.street}
              <br />
              {order.customer.postalCode} {order.customer.city}
              {order.customer.nip && (
                <>
                  <br />
                  NIP {order.customer.nip}
                </>
              )}
            </p>
          </Card>

          <Card>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Płatność</dt>
              <dd>{PAYMENT[order.paymentMethod]}</dd>
              <dt className="text-muted">Magazyn</dt>
              <dd>{order.warehouse.name}</dd>
              {order.shippedAt && (
                <>
                  <dt className="text-muted">Wysłano</dt>
                  <dd>{formatDateTime(order.shippedAt)}</dd>
                </>
              )}
            </dl>
            {order.note && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">{order.note}</p>}
          </Card>
        </div>
      </div>
    </>
  );
}

// Akcje zmiany statusu dostępne dla bieżącego statusu
function StatusActions({ orderId, status }: { orderId: string; status: string }) {
  const action = changeOrderStatus.bind(null, orderId);

  if (status === "DELIVERED" || status === "CANCELLED") {
    return <p className="text-sm text-muted">Zamówienie zakończone.</p>;
  }

  return (
    <ActionForm action={action} className="gap-2">
      {status === "NEW" && (
        <SubmitButton name="status" value="PAID" variant="secondary">
          Oznacz jako opłacone
        </SubmitButton>
      )}
      {(status === "NEW" || status === "PAID") && (
        <SubmitButton
          name="status"
          value="SHIPPED"
          pendingText="Wydawanie z magazynu…"
          confirm="Wysłać zamówienie? Towar zostanie wydany z magazynu (dokument WZ). Tej operacji nie można cofnąć."
        >
          Wyślij (wydaj z magazynu)
        </SubmitButton>
      )}
      {status === "SHIPPED" && (
        <SubmitButton name="status" value="DELIVERED">
          Oznacz jako doręczone
        </SubmitButton>
      )}
      {(status === "NEW" || status === "PAID") && (
        <SubmitButton
          name="status"
          value="CANCELLED"
          variant="danger"
          confirm="Anulować zamówienie? Tej operacji nie można cofnąć."
        >
          Anuluj zamówienie
        </SubmitButton>
      )}
    </ActionForm>
  );
}
