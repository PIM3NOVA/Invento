// Podgląd faktury (/faktury/[id]) w układzie przygotowanym do wydruku.
// Elementy z klasą no-print są ukrywane podczas drukowania.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { summaryByVatRate } from "@/lib/invoice-math";
import { amountInWords } from "@/lib/amount-in-words";
import { PAYMENT } from "@/lib/labels";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { FileCode } from "lucide-react";
import { toggleInvoicePaid } from "../actions";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Faktura" };

export default async function InvoicePage({ params }: PageProps<"/faktury/[id]">) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, order: { select: { id: true, number: true } } },
  });
  if (!invoice) notFound();

  const vatSummary = summaryByVatRate(invoice.items);

  return (
    <>
      {/* Pasek akcji */}
      <div className="no-print mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Faktura {invoice.number}</h1>
          {invoice.isPaid ? <Badge tone="success">Opłacona</Badge> : <Badge tone="warning">Nieopłacona</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionForm action={toggleInvoicePaid.bind(null, invoice.id)}>
            <SubmitButton variant="secondary">
              {invoice.isPaid ? "Oznacz jako nieopłaconą" : "Oznacz jako opłaconą"}
            </SubmitButton>
          </ActionForm>
          {/* zwykły odnośnik – plik generowany przez /faktury/[id]/ksef */}
          <a href={`/faktury/${invoice.id}/ksef`} download className={buttonClass("secondary")}>
            <FileCode className="size-4" /> XML KSeF
          </a>
          <PrintButton />
        </div>
      </div>

      {/* Dokument faktury */}
      {/* overflow-x-auto – przewijanie tabeli na wąskich ekranach */}
      <article className="mx-auto max-w-4xl overflow-x-auto rounded-card bg-white p-5 text-[13px] text-neutral-900 shadow-2xl md:p-10 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="flex flex-col justify-between gap-4 border-b-2 border-brand pb-5 sm:flex-row">
          <div>
            <p className="text-xs tracking-widest text-neutral-500 uppercase">Faktura VAT</p>
            <p className="text-2xl font-bold">{invoice.number}</p>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-right sm:text-left">
            <dt className="text-neutral-500">Data wystawienia:</dt>
            <dd>{formatDate(invoice.issueDate)}</dd>
            <dt className="text-neutral-500">Data sprzedaży:</dt>
            <dd>{formatDate(invoice.saleDate)}</dd>
          </dl>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <Party title="Sprzedawca" name={invoice.sellerName} address={invoice.sellerAddress} nip={invoice.sellerNip} />
          <Party title="Nabywca" name={invoice.buyerName} address={invoice.buyerAddress} nip={invoice.buyerNip} />
        </section>

        <table className="w-full min-w-140 border-collapse">
          <thead>
            <tr className="bg-neutral-100 text-left text-xs text-neutral-600">
              <th className="p-2">Lp.</th>
              <th className="p-2">Nazwa</th>
              <th className="p-2 text-right">Ilość</th>
              <th className="p-2 text-right">Cena netto</th>
              <th className="p-2 text-right">VAT</th>
              <th className="p-2 text-right">Wartość netto</th>
              <th className="p-2 text-right">Wartość brutto</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={item.id} className="border-b border-neutral-200">
                <td className="p-2">{index + 1}</td>
                <td className="p-2">{item.name}</td>
                <td className="p-2 text-right whitespace-nowrap">
                  {item.quantity} {item.unit}
                </td>
                <td className="p-2 text-right whitespace-nowrap">{formatMoney(item.priceNet)}</td>
                <td className="p-2 text-right">{item.vatRate}%</td>
                <td className="p-2 text-right whitespace-nowrap">{formatMoney(item.net)}</td>
                <td className="p-2 text-right whitespace-nowrap">{formatMoney(item.gross)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Zestawienie wg stawek VAT – wymagane na fakturze */}
        <div className="mt-6 flex justify-end">
          <table className="min-w-[320px] border-collapse text-right">
            <thead>
              <tr className="text-xs text-neutral-600">
                <th className="p-2 text-left">Stawka</th>
                <th className="p-2">Netto</th>
                <th className="p-2">VAT</th>
                <th className="p-2">Brutto</th>
              </tr>
            </thead>
            <tbody>
              {vatSummary.map((row) => (
                <tr key={row.vatRate} className="border-b border-neutral-200">
                  <td className="p-2 text-left">{row.vatRate}%</td>
                  <td className="p-2 whitespace-nowrap">{formatMoney(row.net)}</td>
                  <td className="p-2 whitespace-nowrap">{formatMoney(row.vat)}</td>
                  <td className="p-2 whitespace-nowrap">{formatMoney(row.gross)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="p-2 text-left">Razem</td>
                <td className="p-2 whitespace-nowrap">{formatMoney(invoice.totalNet)}</td>
                <td className="p-2 whitespace-nowrap">{formatMoney(invoice.totalVat)}</td>
                <td className="p-2 whitespace-nowrap">{formatMoney(invoice.totalGross)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="mt-6 grid gap-4 rounded-xl bg-neutral-100 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-neutral-500">Do zapłaty</p>
            <p className="text-2xl font-bold text-brand">{formatMoney(invoice.totalGross)}</p>
            <p className="mt-1 text-xs">Słownie: {amountInWords(invoice.totalGross)}</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-neutral-500">Sposób płatności:</dt>
            <dd>{PAYMENT[invoice.paymentMethod]}</dd>
            <dt className="text-neutral-500">Termin płatności:</dt>
            <dd>{formatDate(invoice.dueDate)}</dd>
            {invoice.sellerBank && (
              <>
                <dt className="text-neutral-500">Nr konta:</dt>
                <dd className="break-all">{invoice.sellerBank}</dd>
              </>
            )}
          </dl>
        </section>

        <footer className="mt-12 grid grid-cols-2 gap-10 text-center text-xs text-neutral-500">
          <p className="border-t border-neutral-300 pt-2">Osoba upoważniona do odbioru</p>
          <p className="border-t border-neutral-300 pt-2">Osoba upoważniona do wystawienia</p>
        </footer>
      </article>

      {invoice.order && (
        <p className="no-print mt-6 text-center text-sm text-muted">
          Wystawiona do zamówienia{" "}
          <Link href={`/zamowienia/${invoice.order.id}`} className="text-brand hover:underline">
            {invoice.order.number}
          </Link>
        </p>
      )}
    </>
  );
}

function Party({ title, name, address, nip }: { title: string; name: string; address: string; nip: string | null }) {
  return (
    <div>
      <p className="mb-1 text-xs tracking-widest text-neutral-500 uppercase">{title}</p>
      <p className="font-semibold">{name}</p>
      <p>{address}</p>
      {nip && <p>NIP: {nip}</p>}
    </div>
  );
}
