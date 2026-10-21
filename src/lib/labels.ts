// Etykiety i kolory statusów dla typów wyliczeniowych bazy danych.
import type {
  InventoryStatus,
  MovementType,
  OrderStatus,
  PaymentMethod,
  SalesChannel,
} from "@/generated/prisma/enums";
import type { Tone } from "@/components/ui/card";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  NEW: { label: "Nowe", tone: "brand" },
  PAID: { label: "Opłacone", tone: "warning" },
  SHIPPED: { label: "Wysłane", tone: "success" },
  DELIVERED: { label: "Doręczone", tone: "neutral" },
  CANCELLED: { label: "Anulowane", tone: "danger" },
};

export const CHANNEL: Record<SalesChannel, string> = {
  SHOP: "Sklep internetowy",
  ALLEGRO: "Allegro",
  OLX: "OLX",
  STORE: "Sklep stacjonarny",
  PHONE: "Telefon / e-mail",
};

export const PAYMENT: Record<PaymentMethod, string> = {
  TRANSFER: "Przelew",
  CARD: "Karta / BLIK",
  CASH: "Gotówka",
  COD: "Pobranie",
};

// Typ ruchu -> skrót dokumentu magazynowego + opis
export const MOVEMENT: Record<MovementType, { code: string; label: string; tone: Tone }> = {
  IN: { code: "PZ", label: "Przyjęcie", tone: "success" },
  OUT: { code: "WZ", label: "Wydanie", tone: "danger" },
  TRANSFER: { code: "MM", label: "Przesunięcie", tone: "brand" },
  ADJUST: { code: "INW", label: "Korekta inwentaryzacyjna", tone: "warning" },
};

export const INVENTORY_STATUS: Record<InventoryStatus, { label: string; tone: Tone }> = {
  OPEN: { label: "W trakcie", tone: "warning" },
  CLOSED: { label: "Zamknięta", tone: "success" },
};

export const VAT_RATES = [23, 8, 5, 0];
