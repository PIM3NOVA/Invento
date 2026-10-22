// Pulpit – wskaźniki sprzedaży i magazynu, wykres sprzedaży, alerty niskich stanów.
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Banknote, Boxes, FileWarning, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, plural } from "@/lib/format";
import { calcTotals } from "@/lib/invoice-math";
import { ORDER_STATUS } from "@/lib/labels";
import { Badge, Card, CardTitle, PageHeader, StatCard } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { SalesChart } from "./sales-chart";

export const metadata: Metadata = { title: "Pulpit" };

const DAYS = 14; // zakres wykresu (dni)

export default async function DashboardPage() {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (DAYS - 1));

  // Zapytania wykonywane równolegle
  const [products, recentOrders, orderCount, toShip, unpaidInvoices] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, include: { stock: true } }),
    prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
      include: { items: true },
    }),
    prisma.order.count(),
    prisma.order.findMany({
      where: { status: { in: ["NEW", "PAID"] } },
      include: { customer: true },
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
    prisma.invoice.aggregate({ where: { isPaid: false }, _sum: { totalGross: true }, _count: true }),
  ]);

  // Wartość magazynu i produkty z niskim stanem
  const withQty = products.map((p) => ({ ...p, qty: p.stock.reduce((s, x) => s + x.quantity, 0) }));
  const stockValue = withQty.reduce((sum, p) => sum + p.qty * p.purchasePrice, 0);
  const lowStock = withQty.filter((p) => p.qty <= p.minStock).sort((a, b) => a.qty - b.qty);

  // Sprzedaż brutto w podziale na dni
  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    return { key: date.toDateString(), label: formatDate(date).slice(0, 5), value: 0 };
  });
  for (const order of recentOrders) {
    const day = days.find((d) => d.key === order.createdAt.toDateString());
    if (day) day.value += calcTotals(order.items).gross;
  }
  const salesTotal = days.reduce((sum, d) => sum + d.value, 0);

  return (
    <>
      <PageHeader
        title="Pulpit"
        description="Podsumowanie magazynu i sprzedaży."
        actions={<ButtonLink href="/zamowienia/nowe">Nowe zamówienie</ButtonLink>}
      />

      {/* Wskaźniki */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard
          label={`Sprzedaż ${DAYS} dni`}
          value={formatMoney(salesTotal)}
          hint={plural(recentOrders.length, ["zamówienie", "zamówienia", "zamówień"])}
          icon={<Banknote className="size-5" />}
        />
        <StatCard
          label="Do wysłania"
          value={String(toShip.length)}
          hint={`z ${orderCount} wszystkich`}
          icon={<ShoppingCart className="size-5" />}
        />
        <StatCard
          label="Wartość magazynu"
          value={formatMoney(stockValue)}
          hint={plural(products.length, ["aktywny produkt", "aktywne produkty", "aktywnych produktów"])}
          icon={<Boxes className="size-5" />}
        />
        <StatCard
          label="Nieopłacone FV"
          value={formatMoney(unpaidInvoices._sum.totalGross ?? 0)}
          hint={plural(unpaidInvoices._count, ["faktura", "faktury", "faktur"])}
          icon={<FileWarning className="size-5" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Sprzedaż brutto – ostatnie {DAYS} dni</CardTitle>
          <SalesChart data={days.map(({ label, value }) => ({ label, value }))} />
        </Card>

        <Card>
          <CardTitle action={<AlertTriangle className="size-5 text-warning" />}>Niski stan</CardTitle>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted">Wszystkie produkty powyżej minimum. 👌</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lowStock.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/produkty/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm hover:text-brand-light"
                  >
                    <span className="truncate">{p.name}</span>
                    <Badge tone={p.qty === 0 ? "danger" : "warning"}>
                      {p.qty} / min {p.minStock}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle action={<Link href="/zamowienia" className="text-sm text-brand-light hover:underline">Wszystkie</Link>}>
          Zamówienia do realizacji
        </CardTitle>
        {toShip.length === 0 ? (
          <p className="text-sm text-muted">Brak zamówień oczekujących na wysyłkę.</p>
        ) : (
          <ul className="divide-y divide-line">
            {toShip.map((o) => (
              <li key={o.id}>
                <Link href={`/zamowienia/${o.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-brand-light">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.customer.name}</p>
                    <p className="text-xs text-muted">
                      {o.number} · {formatDate(o.createdAt)}
                    </p>
                  </div>
                  <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
