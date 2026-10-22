// Eksport faktury do pliku XML zgodnego ze strukturą logiczną e-faktury FA(3)
// Krajowego Systemu e-Faktur (KSeF), obowiązującą od 1 lutego 2026 r.
// Schemat: http://crd.gov.pl/wzor/2025/06/25/13775/schemat.xsd

import type { PaymentMethod } from "@/generated/prisma/enums";

export const KSEF_NAMESPACE = "http://crd.gov.pl/wzor/2025/06/25/13775/";

export type KsefInvoice = {
  number: string;
  issueDate: Date;
  saleDate: Date;
  dueDate: Date;
  paymentMethod: PaymentMethod;
  sellerName: string;
  sellerNip: string;
  sellerAddress: string;
  sellerBank: string | null;
  buyerName: string;
  buyerNip: string | null;
  buyerAddress: string;
  buyerCountry: string;
  totalGross: number;
  items: {
    name: string;
    unit: string;
    quantity: number;
    priceNet: number;
    vatRate: number;
    net: number;
    vat: number;
  }[];
};

// Pola sum według stawek VAT, w kolejności wymaganej przez schemat.
// Stawka 0% krajowa nie ma pola kwoty podatku.
const RATE_FIELDS: { rate: number; net: string; vat: string | null; code: string }[] = [
  { rate: 23, net: "P_13_1", vat: "P_14_1", code: "23" },
  { rate: 8, net: "P_13_2", vat: "P_14_2", code: "8" },
  { rate: 5, net: "P_13_3", vat: "P_14_3", code: "5" },
  { rate: 0, net: "P_13_6_1", vat: null, code: "0 KR" },
];

// Kody form płatności według słownika TFormaPlatnosci; pobranie nie ma
// odpowiednika i jest opisywane jako „inna forma płatności”.
const PAYMENT_CODES: Record<PaymentMethod, string | null> = {
  CASH: "1",
  CARD: "2",
  TRANSFER: "6",
  COD: null,
};

// Kody krajów (ISO 3166-1) dla nazw zapisywanych w danych kontrahenta
const COUNTRY_CODES: Record<string, string> = {
  polska: "PL",
  niemcy: "DE",
  czechy: "CZ",
  słowacja: "SK",
  litwa: "LT",
  łotwa: "LV",
  estonia: "EE",
  ukraina: "UA",
  austria: "AT",
  francja: "FR",
  holandia: "NL",
  belgia: "BE",
  włochy: "IT",
  hiszpania: "ES",
  szwecja: "SE",
  dania: "DK",
  irlandia: "IE",
  "wielka brytania": "GB",
};

// NIP: 10 cyfr, bez myślników i spacji (wzorzec etd:TNrNIP)
const NIP_PATTERN = /^[1-9]((\d[1-9])|([1-9]\d))\d{7}$/;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// 12345 (grosze) -> "123.45"
export function ksefAmount(grosze: number) {
  return (grosze / 100).toFixed(2);
}

// Data w strefie czasowej Polski w formacie RRRR-MM-DD
export function ksefDate(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(date);
}

export function normalizeNip(nip: string) {
  return nip.replace(/[\s-]/g, "");
}

// Prosty generator elementów XML: tag(nazwa, zawartość) lub tag(nazwa, [dzieci])
type Node = string | Node[];
const join = (nodes: Node[]): string => nodes.map((n) => (Array.isArray(n) ? join(n) : n)).join("");
function tag(name: string, content: Node): string {
  const inner = Array.isArray(content) ? join(content) : escapeXml(content);
  return `<${name}>${inner}</${name}>`;
}

function buyerIdentification(invoice: KsefInvoice): Node[] {
  const nip = invoice.buyerNip ? normalizeNip(invoice.buyerNip) : "";
  if (NIP_PATTERN.test(nip)) return [tag("NIP", nip)];
  if (nip) return [tag("NrID", nip)]; // identyfikator podatkowy spoza Polski
  return [tag("BrakID", "1")]; // osoba prywatna
}

export function invoiceToKsefXml(invoice: KsefInvoice, createdAt = new Date()): string {
  const sellerNip = normalizeNip(invoice.sellerNip);
  if (!NIP_PATTERN.test(sellerNip)) {
    throw new Error("Nieprawidłowy NIP sprzedawcy – popraw go w ustawieniach firmy.");
  }

  for (const item of invoice.items) {
    if (!RATE_FIELDS.some((r) => r.rate === item.vatRate)) {
      throw new Error(`Stawka VAT ${item.vatRate}% nie jest obsługiwana w eksporcie KSeF.`);
    }
  }

  // Sumy netto i VAT według stawek
  const sums = RATE_FIELDS.flatMap(({ rate, net, vat }) => {
    const items = invoice.items.filter((i) => i.vatRate === rate);
    if (items.length === 0) return [];
    const fields = [tag(net, ksefAmount(items.reduce((s, i) => s + i.net, 0)))];
    if (vat) fields.push(tag(vat, ksefAmount(items.reduce((s, i) => s + i.vat, 0))));
    return fields;
  });

  const lines = invoice.items.map((item, index) =>
    tag("FaWiersz", [
      tag("NrWierszaFa", String(index + 1)),
      tag("P_7", item.name),
      tag("P_8A", item.unit),
      tag("P_8B", String(item.quantity)),
      tag("P_9A", ksefAmount(item.priceNet)),
      tag("P_11", ksefAmount(item.net)),
      tag("P_12", RATE_FIELDS.find((r) => r.rate === item.vatRate)!.code),
    ]),
  );

  const paymentCode = PAYMENT_CODES[invoice.paymentMethod];
  const bank = invoice.sellerBank?.replace(/\s/g, "");
  const payment = tag("Platnosc", [
    tag("TerminPlatnosci", [tag("Termin", ksefDate(invoice.dueDate))]),
    paymentCode
      ? tag("FormaPlatnosci", paymentCode)
      : [tag("PlatnoscInna", "1"), tag("OpisPlatnosci", "Płatność przy odbiorze (pobranie)")],
    bank ? tag("RachunekBankowy", [tag("NrRB", bank)]) : [],
  ]);

  const buyerCountryCode = COUNTRY_CODES[invoice.buyerCountry.trim().toLowerCase()];

  const xml = tag("Faktura", [
    tag("Naglowek", [
      '<KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza>',
      tag("WariantFormularza", "3"),
      tag("DataWytworzeniaFa", createdAt.toISOString().replace(/\.\d{3}Z$/, "Z")),
      tag("SystemInfo", "Invento"),
    ]),
    tag("Podmiot1", [
      tag("DaneIdentyfikacyjne", [tag("NIP", sellerNip), tag("Nazwa", invoice.sellerName)]),
      tag("Adres", [tag("KodKraju", "PL"), tag("AdresL1", invoice.sellerAddress)]),
    ]),
    tag("Podmiot2", [
      tag("DaneIdentyfikacyjne", [...buyerIdentification(invoice), tag("Nazwa", invoice.buyerName)]),
      // adres nabywcy jest opcjonalny – pomijany, gdy kraj nie jest rozpoznany
      buyerCountryCode
        ? tag("Adres", [tag("KodKraju", buyerCountryCode), tag("AdresL1", invoice.buyerAddress)])
        : [],
      tag("JST", "2"),
      tag("GV", "2"),
    ]),
    tag("Fa", [
      tag("KodWaluty", "PLN"),
      tag("P_1", ksefDate(invoice.issueDate)),
      tag("P_2", invoice.number),
      tag("P_6", ksefDate(invoice.saleDate)),
      sums,
      tag("P_15", ksefAmount(invoice.totalGross)),
      // Adnotacje obowiązkowe: brak metody kasowej, samofakturowania, odwrotnego
      // obciążenia, podzielonej płatności, zwolnienia, nowych środków transportu,
      // procedury uproszczonej i procedur marży
      tag("Adnotacje", [
        tag("P_16", "2"),
        tag("P_17", "2"),
        tag("P_18", "2"),
        tag("P_18A", "2"),
        tag("Zwolnienie", [tag("P_19N", "1")]),
        tag("NoweSrodkiTransportu", [tag("P_22N", "1")]),
        tag("P_23", "2"),
        tag("PMarzy", [tag("P_PMarzyN", "1")]),
      ]),
      tag("RodzajFaktury", "VAT"),
      lines,
      payment,
    ]),
  ]);

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    xml.replace("<Faktura>", `<Faktura xmlns="${KSEF_NAMESPACE}">`)
  );
}
