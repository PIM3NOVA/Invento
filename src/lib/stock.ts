// Logika magazynowa. Każda zmiana stanu realizowana jest przez recordMovement(),
// która w ramach jednej transakcji aktualizuje StockLevel i zapisuje dokument
// w StockMovement – stan i historia pozostają spójne.
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { MovementType } from "@/generated/prisma/enums";
import { MOVEMENT } from "@/lib/labels";
import { nextDocumentNumber } from "@/lib/numbering";

type Tx = Prisma.TransactionClient;

// Zmienia stan produktu o `delta`; rzuca błąd przy próbie zejścia poniżej zera.
export async function changeStock(tx: Tx, productId: string, warehouseId: string, delta: number) {
  // utworzenie rekordu stanu, jeśli jeszcze nie istnieje
  const level = await tx.stockLevel.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    create: { productId, warehouseId, quantity: delta },
    update: { quantity: { increment: delta } },
    include: { product: { select: { name: true } } },
  });

  if (level.quantity < 0) {
    // błąd powoduje wycofanie całej transakcji
    throw new Error(
      `Za mało towaru „${level.product.name}” w magazynie (brakuje ${-level.quantity}).`,
    );
  }
  return level;
}

// Kolejny numer dokumentu danego typu, np. "WZ/2026/10/0012"
export function nextMovementNumber(tx: Tx, type: MovementType) {
  return nextDocumentNumber(MOVEMENT[type].code, async (startsWith) => {
    const last = await tx.stockMovement.findFirst({
      where: { documentNo: { startsWith } },
      orderBy: { documentNo: "desc" },
      select: { documentNo: true },
    });
    return last?.documentNo;
  });
}

type MovementInput = {
  type: MovementType;
  productId: string;
  warehouseId: string;
  targetWarehouseId?: string | null;
  quantity: number; // IN/OUT/TRANSFER: zawsze dodatnia; ADJUST: + lub -
  documentNo?: string; // wspólny numer dla pozycji jednego dokumentu
  note?: string | null;
  orderId?: string | null;
  createdBy?: string | null;
};

export async function recordMovement(tx: Tx, input: MovementInput) {
  const { type, productId, warehouseId, targetWarehouseId, quantity } = input;

  // Wpływ typu dokumentu na stany magazynowe
  switch (type) {
    case "IN": // PZ: przyjęcie
      await changeStock(tx, productId, warehouseId, quantity);
      break;
    case "OUT": // WZ: wydanie
      await changeStock(tx, productId, warehouseId, -quantity);
      break;
    case "TRANSFER": // MM: przesunięcie między magazynami
      if (!targetWarehouseId) throw new Error("Wybierz magazyn docelowy.");
      if (targetWarehouseId === warehouseId) throw new Error("Magazyn docelowy musi być inny niż źródłowy.");
      await changeStock(tx, productId, warehouseId, -quantity);
      await changeStock(tx, productId, targetWarehouseId, quantity);
      break;
    case "ADJUST": // INW: korekta inwentaryzacyjna
      await changeStock(tx, productId, warehouseId, quantity);
      break;
  }

  return tx.stockMovement.create({
    data: {
      type,
      productId,
      warehouseId,
      targetWarehouseId: type === "TRANSFER" ? targetWarehouseId : null,
      quantity,
      documentNo: input.documentNo ?? (await nextMovementNumber(tx, type)),
      note: input.note || null,
      orderId: input.orderId ?? null,
      createdBy: input.createdBy ?? null,
    },
  });
}
