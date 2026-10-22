// Nieistniejący adres poza panelem (np. literówka w ścieżce).
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-bold text-brand-light">404</p>
      <h1 className="text-xl font-semibold">Nie znaleziono strony</h1>
      <p className="text-sm text-muted">Sprawdź adres lub wróć do strony głównej.</p>
      <ButtonLink href="/" className="mt-2">
        Wróć do pulpitu
      </ButtonLink>
    </main>
  );
}
