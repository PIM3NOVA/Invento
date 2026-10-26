// Symulacja bieżącej działalności sklepu demonstracyjnego, uruchamiana codziennie
// przez Vercel Cron (/api/cron/symulacja):
//  - uzupełnia zamówienia z ostatnich dni do dziennego celu (zależnego od daty),
//  - przeprowadza zamówienia przez kolejne statusy zgodnie z ich wiekiem
//    (wysyłka tworzy dokument WZ i fakturę),
//  - księguje wpłaty za faktury i dostawy PZ dla produktów z niskim stanem.
// Regularne zapytania utrzymują też aktywność bazy danych.
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus, PaymentMethod, SalesChannel } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { calcLine, calcTotals } from "@/lib/invoice-math";
import { nextDocumentNumber } from "@/lib/numbering";
import { nextMovementNumber, recordMovement } from "@/lib/stock";

type Tx = Prisma.TransactionClient;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const DAYS_BACK = 14; // zakres uzupełniania (jak wykres na pulpicie)
const OPEN_HOUR = 7; // zamówienia składane między 7:00 a 23:00
const CLOSE_HOUR = 23;

const random = Math.random;
const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
const between = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;

// Dzienny cel liczby zamówień – stały dla danej daty (skrót tekstu daty),
// dzięki czemu kolejne uruchomienia uzupełniają ten sam dzień do tej samej wartości.
function dailyTarget(day: Date) {
  let hash = 0;
  for (const ch of day.toDateString()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const weekend = day.getDay() === 0 || day.getDay() === 6;
  return weekend ? 1 + (hash % 3) : 2 + (hash % 5);
}

export async function simulateSales(now = new Date()) {
  const [company, warehouses, products, customers] = await Promise.all([
    prisma.company.findUnique({ where: { id: 1 } }),
    prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, include: { stock: true } }),
    prisma.customer.findMany(),
  ]);
  if (!company || warehouses.length === 0 || products.length === 0 || customers.length === 0) {
    return { created: 0, updated: 0, deliveries: 0 };
  }

  const mainWarehouse = warehouses.find((w) => w.isDefault) ?? warehouses[0];
  const store = warehouses.find((w) => w.id !== mainWarehouse.id);

  const deliveries = await restockLowProducts(products, mainWarehouse.id);
  const created = await createMissingOrders(now, products, customers, mainWarehouse.id, store?.id);
  const updated = await advanceOrders(now, company);
  await settleInvoices(now);

  return { created, updated, deliveries };
}

// Dostawa PZ dla części produktów ze stanem na poziomie minimum lub niższym –
// alerty niskiego stanu pojawiają się, ale nie utrzymują się bez końca.
async function restockLowProducts(
  products: Prisma.ProductGetPayload<{ include: { stock: true } }>[],
  warehouseId: string,
) {
  const low = products.filter((p) => {
    const qty = p.stock.find((s) => s.warehouseId === warehouseId)?.quantity ?? 0;
    return qty <= p.minStock && random() < 0.4;
  });
  if (low.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    const documentNo = await nextMovementNumber(tx, "IN");
    for (const p of low) {
      await recordMovement(tx, {
        type: "IN",
        productId: p.id,
        warehouseId,
        quantity: p.minStock * 2 + between(10, 40),
        documentNo,
        note: "Dostawa od dostawcy",
      });
    }
  });
  return low.length;
}

// Uzupełnia zamówienia z ostatnich dni do dziennego celu. Bieżący dzień
// uzupełniany jest proporcjonalnie do upływu godzin otwarcia.
async function createMissingOrders(
  now: Date,
  products: Prisma.ProductGetPayload<{ include: { stock: true } }>[],
  customers: Prisma.CustomerGetPayload<object>[],
  mainWarehouseId: string,
  storeId: string | undefined,
) {
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (DAYS_BACK - 1));

  const existing = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const channels: SalesChannel[] = ["SHOP", "SHOP", "SHOP", "ALLEGRO", "ALLEGRO", "OLX", "STORE", "PHONE"];
  const payments: PaymentMethod[] = ["TRANSFER", "CARD", "CARD", "COD"];
  let created = 0;

  for (let i = 0; i < DAYS_BACK; i++) {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    const open = new Date(day);
    open.setHours(OPEN_HOUR);
    const close = new Date(day);
    close.setHours(CLOSE_HOUR);
    if (now <= open) continue;

    const ordersOfDay = existing.filter((o) => o.createdAt.toDateString() === day.toDateString());
    const elapsed = Math.min(1, (now.getTime() - open.getTime()) / (close.getTime() - open.getTime()));
    const missing = Math.round(dailyTarget(day) * elapsed) - ordersOfDay.length;
    if (missing <= 0) continue;

    // Nowe zamówienia po ostatnim istniejącym w danym dniu – numeracja zgodna z chronologią
    const from = Math.max(open.getTime(), ...ordersOfDay.map((o) => o.createdAt.getTime() + 60_000));
    const to = Math.min(close.getTime(), now.getTime());
    if (from >= to) continue;

    const times = Array.from({ length: missing }, () => new Date(from + random() * (to - from))).sort(
      (a, b) => a.getTime() - b.getTime(),
    );

    for (const createdAt of times) {
      const customer = pick(customers);
      const channel: SalesChannel = customer.nip ? "PHONE" : pick(channels);
      const warehouseId = channel === "STORE" && storeId ? storeId : mainWarehouseId;
      const paymentMethod: PaymentMethod =
        channel === "STORE" ? pick(["CASH", "CARD"]) : customer.nip ? "TRANSFER" : pick(payments);

      // 1–4 różne produkty dostępne w magazynie realizującym zamówienie
      const available = products.filter(
        (p) => (p.stock.find((s) => s.warehouseId === warehouseId)?.quantity ?? 0) >= 4,
      );
      const pool = available.length > 0 ? available : products;
      const lines = [...new Set(Array.from({ length: between(1, 4) }, () => pick(pool)))];

      const number = await nextDocumentNumber(
        "ZAM",
        async (startsWith) => {
          const last = await prisma.order.findFirst({
            where: { number: { startsWith } },
            orderBy: { number: "desc" },
          });
          return last?.number;
        },
        createdAt,
      );

      await prisma.order.create({
        data: {
          number,
          channel,
          paymentMethod,
          // płatność kartą lub gotówką – zamówienie od razu opłacone
          status: paymentMethod === "CARD" || paymentMethod === "CASH" ? "PAID" : "NEW",
          createdAt,
          customerId: customer.id,
          warehouseId,
          items: {
            create: lines.map((p) => ({
              productId: p.id,
              name: p.name,
              quantity: between(1, customer.nip ? 4 : 2),
              priceNet: p.priceNet,
              vatRate: p.vatRate,
            })),
          },
        },
      });
      created++;
    }
  }
  return created;
}

// Status docelowy zamówienia na podstawie jego wieku (w dniach)
function targetStatus(age: number, paymentMethod: PaymentMethod): OrderStatus {
  if (age >= 4) return "DELIVERED";
  if (age >= 2) return "SHIPPED";
  if (age >= 1) return paymentMethod === "COD" ? "SHIPPED" : "PAID";
  return "NEW";
}

const ORDER_FLOW: OrderStatus[] = ["NEW", "PAID", "SHIPPED", "DELIVERED"];

// Przeprowadza otwarte zamówienia przez kolejne statusy.
async function advanceOrders(now: Date, company: Prisma.CompanyGetPayload<object>) {
  const open = await prisma.order.findMany({
    where: { status: { in: ["NEW", "PAID", "SHIPPED"] }, createdAt: { lt: new Date(now.getTime() - DAY) } },
    orderBy: { createdAt: "asc" },
    select: { id: true, status: true, paymentMethod: true, createdAt: true },
  });

  let updated = 0;
  for (const order of open) {
    const age = (now.getTime() - order.createdAt.getTime()) / DAY;
    let target = targetStatus(age, order.paymentMethod);

    // część nieopłaconych zamówień zostaje anulowana
    if (order.status === "NEW" && order.paymentMethod !== "COD" && random() < 0.06) target = "CANCELLED";
    if (ORDER_FLOW.indexOf(target) <= ORDER_FLOW.indexOf(order.status) && target !== "CANCELLED") continue;

    await prisma.$transaction(async (tx) => {
      const shipping = order.status !== "SHIPPED" && (target === "SHIPPED" || target === "DELIVERED");
      if (shipping) await shipOrder(tx, order.id, company, now);

      await tx.order.update({ where: { id: order.id }, data: { status: target } });
    });
    updated++;
  }
  return updated;
}

// Wysyłka: dokument WZ (z ewentualną dostawą PZ przy braku towaru) i faktura VAT.
async function shipOrder(tx: Tx, orderId: string, company: Prisma.CompanyGetPayload<object>, now: Date) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { customer: true, items: { include: { product: true } }, invoice: true },
  });

  for (const item of order.items) {
    const level = await tx.stockLevel.findUnique({
      where: { productId_warehouseId: { productId: item.productId, warehouseId: order.warehouseId } },
    });
    const shortage = item.quantity - (level?.quantity ?? 0);
    if (shortage > 0) {
      await recordMovement(tx, {
        type: "IN",
        productId: item.productId,
        warehouseId: order.warehouseId,
        quantity: shortage + item.product.minStock + between(5, 20),
        note: "Dostawa od dostawcy",
      });
    }
  }

  const documentNo = await nextMovementNumber(tx, "OUT");
  for (const item of order.items) {
    await recordMovement(tx, {
      type: "OUT",
      productId: item.productId,
      warehouseId: order.warehouseId,
      quantity: item.quantity,
      documentNo,
      orderId: order.id,
      note: `Wysyłka zamówienia ${order.number}`,
    });
  }
  await tx.order.update({ where: { id: order.id }, data: { shippedAt: now } });

  if (order.invoice) return;
  const totals = calcTotals(order.items);
  const c = order.customer;
  const number = await nextDocumentNumber(company.invoicePrefix, async (startsWith) => {
    const last = await tx.invoice.findFirst({
      where: { number: { startsWith } },
      orderBy: { number: "desc" },
    });
    return last?.number;
  });

  await tx.invoice.create({
    data: {
      number,
      orderId: order.id,
      customerId: c.id,
      saleDate: now,
      dueDate: order.paymentMethod === "TRANSFER" ? new Date(now.getTime() + 14 * DAY) : now,
      paymentMethod: order.paymentMethod,
      isPaid: order.paymentMethod === "CARD" || order.paymentMethod === "CASH",
      sellerName: company.name,
      sellerNip: company.nip,
      sellerAddress: `${company.street}, ${company.postalCode} ${company.city}`,
      sellerBank: company.bankAccount,
      buyerName: c.name,
      buyerNip: c.nip,
      buyerAddress: `${c.street}, ${c.postalCode} ${c.city}${c.country !== "Polska" ? `, ${c.country}` : ""}`,
      totalNet: totals.net,
      totalVat: totals.vat,
      totalGross: totals.gross,
      items: {
        create: order.items.map((item) => ({
          name: item.name,
          unit: item.product.unit,
          quantity: item.quantity,
          priceNet: item.priceNet,
          vatRate: item.vatRate,
          ...calcLine(item),
        })),
      },
    },
  });
}

// Wpłaty: pobranie opłacone po doręczeniu, przelew z prawdopodobieństwem
// dziennym 20% – część faktur pozostaje po terminie.
async function settleInvoices(now: Date) {
  await prisma.invoice.updateMany({
    where: { isPaid: false, paymentMethod: "COD", order: { status: "DELIVERED" } },
    data: { isPaid: true },
  });

  const unpaid = await prisma.invoice.findMany({
    where: { isPaid: false, paymentMethod: "TRANSFER", issueDate: { lt: new Date(now.getTime() - 2 * DAY) } },
    select: { id: true },
  });
  const paid = unpaid.filter(() => random() < 0.2).map((i) => i.id);
  if (paid.length > 0) {
    await prisma.invoice.updateMany({ where: { id: { in: paid } }, data: { isPaid: true } });
  }
}
