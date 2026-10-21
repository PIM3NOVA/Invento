"use server";
// Server Actions modułu faktur.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorMessage, type ActionState } from "@/lib/action-state";
import { calcLine, calcTotals } from "@/lib/invoice-math";
import { nextDocumentNumber } from "@/lib/numbering";

const DAY = 24 * 60 * 60 * 1000;

// Wystawienie faktury do zamówienia – dane sprzedawcy, nabywcy i pozycje
// zapisywane są w fakturze w chwili wystawienia.
export async function createInvoiceFromOrder(orderId: string): Promise<ActionState> {
  await requireUser();

  let invoiceId: string;
  try {
    const [company, order] = await Promise.all([
      prisma.company.findUnique({ where: { id: 1 } }),
      prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true, items: { include: { product: true } }, invoice: true },
      }),
    ]);

    if (!company) return { error: "Najpierw uzupełnij dane firmy w Ustawieniach." };
    if (!order) return { error: "Nie znaleziono zamówienia." };
    if (order.invoice) return { error: "To zamówienie ma już fakturę." };

    const totals = calcTotals(order.items);
    const now = new Date();
    const c = order.customer;

    const number = await nextDocumentNumber(company.invoicePrefix, async (startsWith) => {
      const last = await prisma.invoice.findFirst({
        where: { number: { startsWith } },
        orderBy: { number: "desc" },
      });
      return last?.number;
    });

    const invoice = await prisma.invoice.create({
      data: {
        number,
        orderId: order.id,
        customerId: c.id,
        saleDate: order.shippedAt ?? now,
        // termin płatności: przelew 14 dni, pozostałe metody – data wystawienia
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
            ...calcLine(item), // dodaje pola net, vat, gross
          })),
        },
      },
    });
    invoiceId = invoice.id;
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/faktury");
  redirect(`/faktury/${invoiceId}`);
}

// Oznaczenie faktury jako opłaconej / nieopłaconej (przełącznik)
export async function toggleInvoicePaid(invoiceId: string): Promise<ActionState> {
  await requireUser();
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { error: "Nie znaleziono faktury." };

  await prisma.invoice.update({ where: { id: invoiceId }, data: { isPaid: !invoice.isPaid } });
  revalidatePath(`/faktury/${invoiceId}`);
  revalidatePath("/faktury");
  return {};
}
