import { describe, expect, it } from "vitest";
import { invoiceToKsefXml, ksefAmount, ksefDate, type KsefInvoice } from "./ksef";

const invoice: KsefInvoice = {
  number: "FV/2026/10/0007",
  issueDate: new Date("2026-10-21T10:00:00Z"),
  saleDate: new Date("2026-10-20T10:00:00Z"),
  dueDate: new Date("2026-11-04T10:00:00Z"),
  paymentMethod: "TRANSFER",
  sellerName: "Magenta Home Sp. z o.o.",
  sellerNip: "525-281-23-45",
  sellerAddress: "ul. Prosta 1, 00-850 Warszawa",
  sellerBank: "PL61 1090 1014 0000 0712 1981 2874",
  buyerName: "Studio Wnętrz Aurora s.c.",
  buyerNip: "6762456789",
  buyerAddress: "ul. Długa 44, 31-147 Kraków",
  buyerCountry: "Polska",
  totalGross: 61258,
  items: [
    { name: "Lampa", unit: "szt.", quantity: 2, priceNet: 19999, vatRate: 23, net: 39998, vat: 9200 },
    { name: "Kawa", unit: "kg", quantity: 3, priceNet: 4000, vatRate: 8, net: 12000, vat: 960 },
  ],
};

// Zawartość pierwszego elementu o podanej nazwie
function field(xml: string, name: string) {
  return xml.match(new RegExp(`<${name}>(.*?)</${name}>`))?.[1];
}

describe("ksefAmount / ksefDate", () => {
  it("zapisuje kwoty z kropką i dwoma miejscami po przecinku", () => {
    expect(ksefAmount(39998)).toBe("399.98");
    expect(ksefAmount(500)).toBe("5.00");
    expect(ksefAmount(0)).toBe("0.00");
  });

  it("zapisuje datę w strefie czasowej Polski", () => {
    // 23:30 UTC to już następny dzień w Polsce
    expect(ksefDate(new Date("2026-10-21T23:30:00Z"))).toBe("2026-10-22");
  });
});

describe("invoiceToKsefXml", () => {
  const xml = invoiceToKsefXml(invoice, new Date("2026-10-22T09:00:00Z"));

  it("tworzy dokument w przestrzeni nazw schematu FA(3)", () => {
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<Faktura xmlns="http://crd.gov.pl/wzor/2025/06/25/13775/">');
    expect(xml).toContain('kodSystemowy="FA (3)" wersjaSchemy="1-0E"');
    expect(field(xml, "WariantFormularza")).toBe("3");
    expect(field(xml, "DataWytworzeniaFa")).toBe("2026-10-22T09:00:00Z");
  });

  it("zawiera dane faktury i NIP bez myślników", () => {
    expect(field(xml, "P_1")).toBe("2026-10-21");
    expect(field(xml, "P_2")).toBe("FV/2026/10/0007");
    expect(field(xml, "P_6")).toBe("2026-10-20");
    expect(xml).toContain("<NIP>5252812345</NIP>");
    expect(xml).toContain("<NIP>6762456789</NIP>");
  });

  it("sumuje wartości według stawek VAT", () => {
    expect(field(xml, "P_13_1")).toBe("399.98");
    expect(field(xml, "P_14_1")).toBe("92.00");
    expect(field(xml, "P_13_2")).toBe("120.00");
    expect(field(xml, "P_14_2")).toBe("9.60");
    expect(xml).not.toContain("<P_13_3>");
    expect(field(xml, "P_15")).toBe("612.58");
  });

  it("tworzy wiersz dla każdej pozycji", () => {
    expect(xml.match(/<FaWiersz>/g)).toHaveLength(2);
    expect(xml).toContain(
      "<FaWiersz><NrWierszaFa>1</NrWierszaFa><P_7>Lampa</P_7><P_8A>szt.</P_8A><P_8B>2</P_8B>" +
        "<P_9A>199.99</P_9A><P_11>399.98</P_11><P_12>23</P_12></FaWiersz>",
    );
  });

  it("zapisuje termin, formę płatności i rachunek bez spacji", () => {
    expect(field(xml, "Termin")).toBe("2026-11-04");
    expect(field(xml, "FormaPlatnosci")).toBe("6");
    expect(field(xml, "NrRB")).toBe("PL61109010140000071219812874");
  });

  it("oznacza osobę prywatną jako nabywcę bez identyfikatora", () => {
    const result = invoiceToKsefXml({ ...invoice, buyerNip: null });
    expect(result).toContain("<BrakID>1</BrakID>");
  });

  it("opisuje płatność za pobraniem jako inną formę płatności", () => {
    const result = invoiceToKsefXml({ ...invoice, paymentMethod: "COD" });
    expect(result).toContain("<PlatnoscInna>1</PlatnoscInna>");
    expect(result).not.toContain("<FormaPlatnosci>");
  });

  it("stawka 0% trafia do pola sprzedaży krajowej 0%", () => {
    const result = invoiceToKsefXml({
      ...invoice,
      items: [{ name: "Usługa", unit: "usł.", quantity: 1, priceNet: 1000, vatRate: 0, net: 1000, vat: 0 }],
    });
    expect(field(result, "P_13_6_1")).toBe("10.00");
    expect(field(result, "P_12")).toBe("0 KR");
  });

  it("pomija adres nabywcy z nierozpoznanego kraju", () => {
    const result = invoiceToKsefXml({ ...invoice, buyerNip: "CA123", buyerCountry: "Kanada" });
    expect(result).toContain("<NrID>CA123</NrID>");
    expect(result.match(/<Adres>/g)).toHaveLength(1); // tylko adres sprzedawcy
  });

  it("zamienia znaki specjalne XML", () => {
    const result = invoiceToKsefXml({ ...invoice, buyerName: 'Firma "A&B" <test>' });
    expect(result).toContain("<Nazwa>Firma &quot;A&amp;B&quot; &lt;test&gt;</Nazwa>");
  });

  it("odrzuca nieprawidłowy NIP sprzedawcy", () => {
    expect(() => invoiceToKsefXml({ ...invoice, sellerNip: "123" })).toThrow("NIP sprzedawcy");
  });
});
