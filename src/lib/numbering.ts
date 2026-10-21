// Numeracja dokumentów w formacie PREFIX/ROK/MIESIĄC/NUMER (np. FV/2026/10/0007),
// rozpoczynana od 1 w każdym miesiącu.
import "server-only";

// Zwraca kolejny numer dokumentu. `findLast` zwraca ostatni istniejący numer
// z danym prefiksem – funkcja jest wspólna dla wszystkich typów dokumentów.
export async function nextDocumentNumber(
  prefix: string,
  findLast: (startsWith: string) => Promise<string | null | undefined>,
  date = new Date(),
): Promise<string> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const base = `${prefix}/${year}/${month}/`;

  const last = await findLast(base);
  // "FV/2026/10/0007" -> 7
  const lastNumber = last ? Number(last.slice(base.length)) : 0;

  return base + String(lastNumber + 1).padStart(4, "0");
}
