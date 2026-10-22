import { beforeEach, describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { recordMovement } from "./stock";

// Transakcja Prismy zastąpiona prostą bazą w pamięci – testowana jest
// wyłącznie logika zmian stanów i numeracji dokumentów.
type Movement = { documentNo: string; [key: string]: unknown };
type UpsertArgs = {
  where: { productId_warehouseId: { productId: string; warehouseId: string } };
  create: { quantity: number };
  update: { quantity: { increment: number } };
};

function createFakeTx() {
  const levels = new Map<string, number>();
  const movements: Movement[] = [];

  const tx = {
    stockLevel: {
      upsert: async ({ where, create, update }: UpsertArgs) => {
        const { productId, warehouseId } = where.productId_warehouseId;
        const key = `${productId}|${warehouseId}`;
        const quantity = levels.has(key)
          ? levels.get(key)! + update.quantity.increment
          : create.quantity;
        levels.set(key, quantity);
        return { productId, warehouseId, quantity, product: { name: `Produkt ${productId}` } };
      },
    },
    stockMovement: {
      findFirst: async ({ where }: { where: { documentNo: { startsWith: string } } }) => {
        const matching = movements
          .map((m) => m.documentNo)
          .filter((no) => no.startsWith(where.documentNo.startsWith))
          .sort()
          .reverse();
        return matching.length ? { documentNo: matching[0] } : null;
      },
      create: async ({ data }: { data: Movement }) => {
        movements.push(data);
        return data;
      },
    },
  };

  return {
    tx: tx as unknown as Prisma.TransactionClient,
    stock: (productId: string, warehouseId: string) => levels.get(`${productId}|${warehouseId}`) ?? 0,
    movements,
  };
}

describe("recordMovement", () => {
  let db: ReturnType<typeof createFakeTx>;

  beforeEach(() => {
    db = createFakeTx();
  });

  it("PZ zwiększa stan w magazynie", async () => {
    await recordMovement(db.tx, { type: "IN", productId: "p1", warehouseId: "w1", quantity: 10 });
    await recordMovement(db.tx, { type: "IN", productId: "p1", warehouseId: "w1", quantity: 5 });
    expect(db.stock("p1", "w1")).toBe(15);
  });

  it("WZ zmniejsza stan w magazynie", async () => {
    await recordMovement(db.tx, { type: "IN", productId: "p1", warehouseId: "w1", quantity: 10 });
    await recordMovement(db.tx, { type: "OUT", productId: "p1", warehouseId: "w1", quantity: 4 });
    expect(db.stock("p1", "w1")).toBe(6);
  });

  it("WZ nie pozwala zejść poniżej zera", async () => {
    await recordMovement(db.tx, { type: "IN", productId: "p1", warehouseId: "w1", quantity: 3 });
    await expect(
      recordMovement(db.tx, { type: "OUT", productId: "p1", warehouseId: "w1", quantity: 5 }),
    ).rejects.toThrow("brakuje 2");
    // dokument nie zostaje zapisany
    expect(db.movements).toHaveLength(1);
  });

  it("MM przenosi towar między magazynami", async () => {
    await recordMovement(db.tx, { type: "IN", productId: "p1", warehouseId: "w1", quantity: 10 });
    await recordMovement(db.tx, {
      type: "TRANSFER",
      productId: "p1",
      warehouseId: "w1",
      targetWarehouseId: "w2",
      quantity: 7,
    });
    expect(db.stock("p1", "w1")).toBe(3);
    expect(db.stock("p1", "w2")).toBe(7);
  });

  it("MM wymaga innego magazynu docelowego", async () => {
    await expect(
      recordMovement(db.tx, { type: "TRANSFER", productId: "p1", warehouseId: "w1", quantity: 1 }),
    ).rejects.toThrow("Wybierz magazyn docelowy.");
    await expect(
      recordMovement(db.tx, {
        type: "TRANSFER",
        productId: "p1",
        warehouseId: "w1",
        targetWarehouseId: "w1",
        quantity: 1,
      }),
    ).rejects.toThrow("Magazyn docelowy musi być inny niż źródłowy.");
  });

  it("MM nie przenosi więcej, niż jest w magazynie źródłowym", async () => {
    await recordMovement(db.tx, { type: "IN", productId: "p1", warehouseId: "w1", quantity: 2 });
    await expect(
      recordMovement(db.tx, {
        type: "TRANSFER",
        productId: "p1",
        warehouseId: "w1",
        targetWarehouseId: "w2",
        quantity: 5,
      }),
    ).rejects.toThrow("Za mało towaru");
    expect(db.stock("p1", "w2")).toBe(0);
  });

  it("korekta inwentaryzacyjna działa w obu kierunkach", async () => {
    await recordMovement(db.tx, { type: "IN", productId: "p1", warehouseId: "w1", quantity: 10 });
    await recordMovement(db.tx, { type: "ADJUST", productId: "p1", warehouseId: "w1", quantity: -3 });
    expect(db.stock("p1", "w1")).toBe(7);
    await recordMovement(db.tx, { type: "ADJUST", productId: "p1", warehouseId: "w1", quantity: 2 });
    expect(db.stock("p1", "w1")).toBe(9);
  });

  it("nadaje kolejne numery dokumentów osobno dla każdego typu", async () => {
    await recordMovement(db.tx, { type: "IN", productId: "p1", warehouseId: "w1", quantity: 10 });
    await recordMovement(db.tx, { type: "IN", productId: "p2", warehouseId: "w1", quantity: 10 });
    await recordMovement(db.tx, { type: "OUT", productId: "p1", warehouseId: "w1", quantity: 1 });

    const numbers = db.movements.map((m) => m.documentNo);
    expect(numbers[0]).toMatch(/^PZ\/\d{4}\/\d{2}\/0001$/);
    expect(numbers[1]).toMatch(/^PZ\/\d{4}\/\d{2}\/0002$/);
    expect(numbers[2]).toMatch(/^WZ\/\d{4}\/\d{2}\/0001$/);
  });

  it("zachowuje wspólny numer dla pozycji jednego dokumentu", async () => {
    const documentNo = "PZ/2026/10/0042";
    await recordMovement(db.tx, { type: "IN", productId: "p1", warehouseId: "w1", quantity: 1, documentNo });
    await recordMovement(db.tx, { type: "IN", productId: "p2", warehouseId: "w1", quantity: 1, documentNo });
    expect(db.movements.map((m) => m.documentNo)).toEqual([documentNo, documentNo]);
  });

  it("magazyn docelowy zapisywany jest tylko dla MM", async () => {
    await recordMovement(db.tx, {
      type: "IN",
      productId: "p1",
      warehouseId: "w1",
      targetWarehouseId: "w2",
      quantity: 1,
    });
    expect(db.movements[0].targetWarehouseId).toBeNull();
  });
});
