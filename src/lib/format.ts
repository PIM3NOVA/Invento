// Formatowanie kwot, dat i liczebników (pl-PL).

// 1299 (grosze) -> "12,99 zł"
export function formatMoney(grosze: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(grosze / 100);
}

// 1299 -> "12.99" (wartość pola formularza)
export function groszeToInput(grosze: number): string {
  return (grosze / 100).toFixed(2);
}

// "12,99" / "12.99" -> 1299 (grosze)
export function inputToGrosze(value: string): number {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

// Date -> "21.10.2026"
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "short" }).format(date);
}

// Date -> "21.10.2026, 14:05"
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

// Odmiana rzeczownika przez liczbę: plural(5, ["faktura", "faktury", "faktur"]) -> "5 faktur"
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const lastTwo = n % 100;
  const last = n % 10;
  const form =
    n === 1 ? one : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
  return `${n} ${form}`;
}
