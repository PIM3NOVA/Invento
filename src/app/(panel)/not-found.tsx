// Brak rekordu (np. usunięty produkt lub błędny adres) – widok w układzie panelu.
import { EmptyState } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export default function PanelNotFound() {
  return (
    <EmptyState title="Nie znaleziono strony">
      <p>Szukany element nie istnieje lub został usunięty.</p>
      <ButtonLink href="/" className="mt-4">
        Wróć do pulpitu
      </ButtonLink>
    </EmptyState>
  );
}
