// Typy i funkcje pomocnicze Server Actions.
import type { z } from "zod";

// Wynik akcji zwracany do formularza (błąd lub komunikat powodzenia).
export type ActionState = { error?: string; success?: string };

// Walidacja FormData schematem Zod – zwraca dane albo pierwszy komunikat błędu.
export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { ok: true; data: z.infer<T>; error?: undefined } | { ok: false; data?: undefined; error: string } {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Niepoprawne dane formularza." };
  }
  return { ok: true, data: result.data };
}

// Mapowanie wyjątków na komunikaty dla użytkownika
export function errorMessage(error: unknown): string {
  // P2002 – naruszenie ograniczenia unikalności
  if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
    return "Taki rekord już istnieje (powtórzony unikalny kod).";
  }
  if (error instanceof Error) return error.message;
  return "Coś poszło nie tak. Spróbuj ponownie.";
}
