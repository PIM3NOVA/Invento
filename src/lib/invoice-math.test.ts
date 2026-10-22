import { describe, expect, it } from "vitest";
import { calcLine, calcTotals, summaryByVatRate } from "./invoice-math";

describe("calcLine", () => {
  it("liczy netto, VAT i brutto pozycji", () => {
    // 3 szt. × 100,00 zł netto, VAT 23%
    expect(calcLine({ quantity: 3, priceNet: 10000, vatRate: 23 })).toEqual({
      net: 30000,
      vat: 6900,
      gross: 36900,
    });
  });

  it("zaokrągla VAT do pełnego grosza", () => {
    // 0,99 zł × 23% = 0,2277 zł -> 0,23 zł
    expect(calcLine({ quantity: 1, priceNet: 99, vatRate: 23 }).vat).toBe(23);
    // 0,10 zł × 5% = 0,005 zł -> 0,01 zł
    expect(calcLine({ quantity: 1, priceNet: 10, vatRate: 5 }).vat).toBe(1);
  });

  it("obsługuje stawkę 0%", () => {
    expect(calcLine({ quantity: 2, priceNet: 5000, vatRate: 0 })).toEqual({
      net: 10000,
      vat: 0,
      gross: 10000,
    });
  });
});

describe("calcTotals", () => {
  it("sumuje wartości wszystkich pozycji", () => {
    const totals = calcTotals([
      { quantity: 2, priceNet: 10000, vatRate: 23 },
      { quantity: 1, priceNet: 5000, vatRate: 8 },
    ]);
    expect(totals).toEqual({ net: 25000, vat: 5000, gross: 30000 });
  });

  it("zwraca zera dla pustej listy pozycji", () => {
    expect(calcTotals([])).toEqual({ net: 0, vat: 0, gross: 0 });
  });

  it("brutto jest zawsze sumą netto i VAT", () => {
    const totals = calcTotals([
      { quantity: 7, priceNet: 1333, vatRate: 23 },
      { quantity: 3, priceNet: 999, vatRate: 8 },
      { quantity: 1, priceNet: 1, vatRate: 5 },
    ]);
    expect(totals.gross).toBe(totals.net + totals.vat);
  });
});

describe("summaryByVatRate", () => {
  it("grupuje pozycje według stawek, od najwyższej", () => {
    const summary = summaryByVatRate([
      { quantity: 1, priceNet: 1000, vatRate: 8 },
      { quantity: 1, priceNet: 2000, vatRate: 23 },
      { quantity: 2, priceNet: 1000, vatRate: 8 },
    ]);
    expect(summary).toEqual([
      { vatRate: 23, net: 2000, vat: 460, gross: 2460 },
      { vatRate: 8, net: 3000, vat: 240, gross: 3240 },
    ]);
  });

  it("suma zestawienia jest równa sumie faktury", () => {
    const lines = [
      { quantity: 3, priceNet: 4999, vatRate: 23 },
      { quantity: 1, priceNet: 1250, vatRate: 5 },
      { quantity: 5, priceNet: 199, vatRate: 23 },
    ];
    const totals = calcTotals(lines);
    const summary = summaryByVatRate(lines);
    expect(summary.reduce((s, r) => s + r.gross, 0)).toBe(totals.gross);
    expect(summary.reduce((s, r) => s + r.vat, 0)).toBe(totals.vat);
  });
});
