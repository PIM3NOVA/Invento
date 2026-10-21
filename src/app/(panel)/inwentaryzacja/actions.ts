"use server";
// Server Actions inwentaryzacji (spis z natury).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorMessage, type ActionState } from "@/lib/action-state";
import { nextDocumentNumber } from "@/lib/numbering";
import { nextMovementNumber, recordMovement } from "@/lib/stock";

// Rozpoczęcie spisu – zapis stanów systemowych aktywnych produktów w magazynie.
export async function startInventory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const warehouseId = String(formData.get("warehouseId") ?? "");
  if (!warehouseId) return { error: "Wybierz magazyn." };

  let countId: string;
  try {
    const open = await prisma.inventoryCount.findFirst({ where: { warehouseId, status: "OPEN" } });
    if (open) return { error: `W tym magazynie trwa już spis ${open.number}. Najpierw go zamknij.` };

    const [products, stock] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true }, select: { id: true } }),
      prisma.stockLevel.findMany({ where: { warehouseId } }),
    ]);

    const number = await nextDocumentNumber("INW", async (startsWith) => {
      const last = await prisma.inventoryCount.findFirst({
        where: { number: { startsWith } },
        orderBy: { number: "desc" },
      });
      return last?.number;
    });

    const count = await prisma.inventoryCount.create({
      data: {
        number,
        warehouseId,
        // utworzenie spisu wraz z pozycjami
        items: {
          create: products.map((p) => ({
            productId: p.id,
            expectedQty: stock.find((s) => s.productId === p.id)?.quantity ?? 0,
          })),
        },
      },
    });
    countId = count.id;
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/inwentaryzacja");
  redirect(`/inwentaryzacja/${countId}`);
}

// Zapis ilości policzonych i opcjonalne zamknięcie spisu.
// Pola formularza: counted_<idPozycji>.
export async function saveInventory(
  countId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const closeIt = formData.get("intent") === "close";

  const count = await prisma.inventoryCount.findUnique({
    where: { id: countId },
    include: { items: true },
  });
  if (!count) return { error: "Nie znaleziono spisu." };
  if (count.status === "CLOSED") return { error: "Ten spis jest już zamknięty." };

  // Puste pole oznacza pozycję niepoliczoną (null)
  const counted = count.items.map((item) => {
    const raw = String(formData.get(`counted_${item.id}`) ?? "").trim();
    return { item, value: raw === "" ? null : Number(raw) };
  });
  if (counted.some((c) => c.value !== null && (!Number.isInteger(c.value) || c.value < 0))) {
    return { error: "Ilości muszą być liczbami całkowitymi ≥ 0." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const { item, value } of counted) {
        await tx.inventoryCountItem.update({ where: { id: item.id }, data: { countedQty: value } });
      }

      if (!closeIt) return;

      // Zamknięcie spisu: korekta względem aktualnego stanu (uwzględnia ruchy
      // zarejestrowane w trakcie trwania spisu).
      const documentNo = await nextMovementNumber(tx, "ADJUST"); // jeden dokument INW na cały spis
      for (const { item, value } of counted) {
        if (value === null) continue;
        const level = await tx.stockLevel.findUnique({
          where: { productId_warehouseId: { productId: item.productId, warehouseId: count.warehouseId } },
        });
        const delta = value - (level?.quantity ?? 0);
        if (delta === 0) continue;

        await recordMovement(tx, {
          type: "ADJUST",
          productId: item.productId,
          warehouseId: count.warehouseId,
          quantity: delta,
          documentNo,
          note: `Inwentaryzacja ${count.number}`,
          createdBy: user.email,
        });
      }

      await tx.inventoryCount.update({
        where: { id: countId },
        data: { status: "CLOSED", closedAt: new Date() },
      });
    }, { timeout: 30_000 }); // wydłużony limit czasu dla dużej liczby pozycji
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath(`/inwentaryzacja/${countId}`);
  revalidatePath("/inwentaryzacja");
  return { success: closeIt ? "Spis zamknięty, stany zostały wyrównane." : "Zapisano postęp." };
}
