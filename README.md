<p align="center">
  <img src=".github/assets/banner.svg" alt="Invento – Magazyn · Zamówienia · Faktury" width="100%">
</p>

<p align="center">
  <a href="https://invento-roan.vercel.app"><img src="https://img.shields.io/badge/Wersja_live-invento--roan.vercel.app-e5007e?style=for-the-badge&logo=vercel&logoColor=white&labelColor=07070a" alt="Wersja live"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-07070a?style=flat-square&logo=nextdotjs&logoColor=e5007e" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-07070a?style=flat-square&logo=typescript&logoColor=e5007e" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-07070a?style=flat-square&logo=tailwindcss&logoColor=e5007e" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Prisma_7-07070a?style=flat-square&logo=prisma&logoColor=e5007e" alt="Prisma">
  <img src="https://img.shields.io/badge/Supabase-07070a?style=flat-square&logo=supabase&logoColor=e5007e" alt="Supabase">
  <img src="https://img.shields.io/badge/Vercel-07070a?style=flat-square&logo=vercel&logoColor=e5007e" alt="Vercel">
</p>

Responsywna aplikacja webowa do zarządzania magazynem i sprzedażą w małych firmach e-commerce. Łączy w jednym miejscu obsługę stanów magazynowych w wielu magazynach, dokumentów magazynowych, inwentaryzacji, zamówień z różnych kanałów sprzedaży oraz wystawiania faktur VAT.

Projekt realizowany w ramach pracy inżynierskiej.

## Funkcjonalności

| Moduł | Opis |
|---|---|
| **Pulpit** | Sprzedaż z ostatnich 14 dni (wykres), zamówienia do realizacji, wartość magazynu, nieopłacone faktury, alerty niskich stanów |
| **Produkty** | Katalog z kategoriami, SKU, EAN, ceną netto, stawką VAT i progiem minimalnego stanu; wyszukiwarka i filtrowanie; stany w podziale na magazyny i historia ruchów |
| **Magazyny** | Wiele magazynów z podsumowaniem liczby produktów, sztuk i wartości zapasu |
| **Ruchy magazynowe** | Dokumenty PZ (przyjęcie), WZ (wydanie), MM (przesunięcie między magazynami) oraz korekty inwentaryzacyjne; blokada wydania towaru ponad stan |
| **Inwentaryzacja** | Spis z natury: zapis stanów systemowych, wprowadzanie ilości policzonych z bieżącym wyliczaniem różnic, zamknięcie spisu z automatycznym wyrównaniem stanów |
| **Zamówienia** | Kanały sprzedaży (sklep internetowy, Allegro, OLX, sprzedaż stacjonarna, telefon), statusy realizacji; podgląd dostępnego stanu przy dodawaniu produktów; wysyłka automatycznie generuje dokument WZ |
| **Kontrahenci** | Klienci firmowi (NIP) i indywidualni wraz z historią zamówień |
| **Faktury VAT** | Wystawianie faktury do zamówienia, zestawienie według stawek VAT, kwota słownie, statusy płatności i terminy, wydruk / zapis do PDF, eksport do pliku XML w strukturze FA(3) Krajowego Systemu e-Faktur (KSeF) |
| **Ustawienia firmy** | Dane sprzedawcy i prefiks numeracji faktur |

Dokumenty numerowane są automatycznie w formacie `PREFIX/ROK/MIESIĄC/NUMER` (np. `FV/2026/10/0001`).

Interfejs działa na komputerze i urządzeniach mobilnych: na smartfonie tabele zamieniają się w karty, a nawigacja w dolny pasek zakładek. Aplikację można zainstalować na telefonie jako PWA.

## Technologie

- **Next.js 16** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Tailwind CSS 4**
- **Prisma ORM 7**
- **PostgreSQL (Supabase)**: baza danych i uwierzytelnianie (Supabase Auth)
- **Zod**: walidacja danych formularzy
- **Vitest**: testy jednostkowe
- **Vercel**: hosting i automatyczne wdrożenia

## Architektura

- Strony są komponentami serwerowymi, które pobierają dane bezpośrednio z bazy przez Prisma.
- Operacje zapisu realizowane są przez Server Actions z walidacją Zod i weryfikacją zalogowanego użytkownika.
- Każda zmiana stanu magazynowego przechodzi przez jedną funkcję (`src/lib/stock.ts`), która w ramach transakcji aktualizuje stan i zapisuje dokument w historii ruchów. Stan i historia pozostają zawsze spójne.
- Kwoty przechowywane są w groszach jako liczby całkowite, co eliminuje błędy zaokrągleń.
- Faktury i pozycje zamówień przechowują kopię danych z chwili wystawienia, więc późniejsze zmiany w katalogu lub danych kontrahenta nie wpływają na dokumenty historyczne.
- Na wszystkich tabelach włączone jest Row Level Security. Dostęp do danych odbywa się wyłącznie po stronie serwera aplikacji.
- Operacje nieodwracalne (wysyłka i anulowanie zamówienia, zamknięcie spisu) wymagają potwierdzenia.
- Eksport KSeF (`src/lib/ksef.ts`) generuje plik zgodny ze schematem FA(3) opublikowanym przez Ministerstwo Finansów; wysyłka do KSeF nie jest obsługiwana.

### Struktura projektu

```
prisma/
  schema.prisma          model danych
  migrations/            migracje bazy danych
  seed.ts                dane przykładowe
src/
  app/
    login/               logowanie i rejestracja
    (panel)/             moduły aplikacji (pulpit, produkty, magazyny, ruchy,
                         inwentaryzacja, zamówienia, kontrahenci, faktury, ustawienia)
  components/            komponenty interfejsu i nawigacja
  lib/                   logika biznesowa i funkcje pomocnicze
  proxy.ts               ochrona tras i odświeżanie sesji
```

### Model danych

`Product`, `Category`, `Warehouse`, `StockLevel` (stan produktu w magazynie), `StockMovement` (dokumenty magazynowe), `InventoryCount` / `InventoryCountItem` (inwentaryzacja), `Customer`, `Order` / `OrderItem`, `Invoice` / `InvoiceItem`, `Company` (dane sprzedawcy).

## Testy

Logika biznesowa objęta jest testami jednostkowymi (Vitest, 73 testy):

| Moduł | Zakres |
|---|---|
| `invoice-math` | wartości netto, VAT i brutto, zaokrąglanie, zestawienie według stawek |
| `amount-in-words` | kwota słownie z odmianą złotych, tysięcy i milionów |
| `numbering` | numeracja dokumentów w formacie `PREFIX/ROK/MIESIĄC/NUMER` |
| `format` | odmiana liczebników, konwersja kwot z formularzy |
| `stock` | dokumenty PZ, WZ, MM, korekty, blokada stanu poniżej zera |
| `ksef` | struktura pliku FA(3), sumy według stawek, dane nabywcy, płatność |

```bash
npm test
```

## Uruchomienie lokalne

Wymagania: Node.js 20.9+ oraz projekt w [Supabase](https://supabase.com).

```bash
cp .env.example .env     # uzupełnij danymi połączenia z Supabase
npm install
npm run db:migrate       # utworzenie tabel
npm run db:seed          # opcjonalnie: dane przykładowe
npm run dev              # http://localhost:3000
```

Zmienne środowiskowe:

| Zmienna | Opis |
|---|---|
| `DATABASE_URL` | połączenie przez pooler transakcyjny Supabase (port 6543) |
| `DIRECT_URL` | połączenie sesyjne (port 5432), używane przez migracje |
| `NEXT_PUBLIC_SUPABASE_URL` | adres projektu Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | klucz publiczny Supabase |

### Skrypty

| Komenda | Opis |
|---|---|
| `npm run dev` | serwer deweloperski |
| `npm run build` | build produkcyjny |
| `npm run lint` | analiza statyczna kodu (ESLint) |
| `npm test` | testy jednostkowe (Vitest) |
| `npm run db:migrate` | migracja bazy danych |
| `npm run db:deploy` | zastosowanie migracji na środowisku produkcyjnym |
| `npm run db:seed` | wgranie danych przykładowych (czyści bazę) |
| `npm run db:studio` | podgląd bazy danych (Prisma Studio) |

## Wdrożenie

Aplikacja jest wdrożona na platformie Vercel (region Frankfurt, obok bazy danych). Każda zmiana na gałęzi `main` automatycznie publikuje nową wersję.
