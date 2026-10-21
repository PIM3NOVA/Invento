// Kwota słownie na fakturze, np. 123456 (grosze) -> "tysiąc dwieście trzydzieści cztery złote 56/100"

const UNITS = ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"];
const TEENS = ["dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"];
const TENS = ["", "", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"];
const HUNDREDS = ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset"];

// Odmiana: 1 złoty, 2–4 złote, 5+ złotych (22 złote, 25 złotych)
function pluralForm(n: number, forms: [string, string, string]) {
  if (n === 1) return forms[0];
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return forms[1];
  return forms[2];
}

// Liczba od 0 do 999 słownie
function hundredsToWords(n: number): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts = [HUNDREDS[h]];
  if (t === 1) parts.push(TEENS[u]);
  else parts.push(TENS[t], UNITS[u]);
  return parts.filter(Boolean).join(" ");
}

const GROUPS: [string, string, string][] = [
  ["", "", ""],
  ["tysiąc", "tysiące", "tysięcy"],
  ["milion", "miliony", "milionów"],
];

export function amountInWords(grosze: number): string {
  const zlote = Math.floor(grosze / 100);
  const rest = grosze % 100;

  if (zlote === 0) return `zero złotych ${String(rest).padStart(2, "0")}/100`;

  // Podział na grupy trzycyfrowe od końca: 1 234 567 -> [567, 234, 1]
  const words: string[] = [];
  let n = zlote;
  let groupIndex = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      // "tysiąc" zamiast "jeden tysiąc"
      const chunkWords = groupIndex > 0 && chunk === 1 ? "" : hundredsToWords(chunk);
      const groupName = groupIndex > 0 ? pluralForm(chunk, GROUPS[groupIndex]) : "";
      words.unshift([chunkWords, groupName].filter(Boolean).join(" "));
    }
    n = Math.floor(n / 1000);
    groupIndex++;
  }

  const currency = pluralForm(zlote, ["złoty", "złote", "złotych"]);
  return `${words.join(" ")} ${currency} ${String(rest).padStart(2, "0")}/100`;
}
