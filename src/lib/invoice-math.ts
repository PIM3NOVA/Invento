// Obliczenia wartości netto, VAT i brutto (w groszach).

export type LineInput = { quantity: number; priceNet: number; vatRate: number };

// Wartości pojedynczej pozycji
export function calcLine({ quantity, priceNet, vatRate }: LineInput) {
  const net = quantity * priceNet;
  const vat = Math.round((net * vatRate) / 100); // zaokrąglenie do pełnego grosza
  return { net, vat, gross: net + vat };
}

// Suma wartości wszystkich pozycji
export function calcTotals(lines: LineInput[]) {
  return lines.reduce(
    (sum, line) => {
      const { net, vat, gross } = calcLine(line);
      return { net: sum.net + net, vat: sum.vat + vat, gross: sum.gross + gross };
    },
    { net: 0, vat: 0, gross: 0 },
  );
}

// Zestawienie wartości według stawek VAT (element obowiązkowy faktury)
export function summaryByVatRate(lines: LineInput[]) {
  const map = new Map<number, { net: number; vat: number; gross: number }>();
  for (const line of lines) {
    const { net, vat, gross } = calcLine(line);
    const current = map.get(line.vatRate) ?? { net: 0, vat: 0, gross: 0 };
    map.set(line.vatRate, {
      net: current.net + net,
      vat: current.vat + vat,
      gross: current.gross + gross,
    });
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([vatRate, sums]) => ({ vatRate, ...sums }));
}
