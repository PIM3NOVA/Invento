"use server";
// Server Actions modułu produktów.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorMessage, parseForm, type ActionState } from "@/lib/action-state";
import { inputToGrosze } from "@/lib/format";
import { recordMovement } from "@/lib/stock";

// Walidacja formularza produktu
const productSchema = z.object({
  name: z.string().trim().min(2, "Nazwa musi mieć co najmniej 2 znaki."),
  sku: z.string().trim().min(1, "Podaj kod SKU.").toUpperCase(),
  ean: z.string().trim().optional(),
  category: z.string().trim().optional(),
  description: z.string().trim().optional(),
  unit: z.string().trim().min(1).default("szt"),
  priceNet: z.string().min(1, "Podaj cenę sprzedaży.").transform(inputToGrosze),
  purchasePrice: z.string().optional().transform((v) => (v ? inputToGrosze(v) : 0)),
  vatRate: z.coerce.number().int(),
  minStock: z.coerce.number().int().min(0, "Minimalny stan nie może być ujemny."),
  isActive: z.string().optional().transform((v) => v === "on"), // checkbox: "on" albo brak
  // tylko przy dodawaniu: stan początkowy
  initialQty: z.coerce.number().int().min(0).optional(),
  initialWarehouseId: z.string().optional(),
});

// Tworzenie (productId = null) lub edycja produktu; productId przekazywany przez bind().
export async function saveProduct(
  productId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const { ok, data, error } = parseForm(productSchema, formData);
  if (!ok) return { error };
  if (Number.isNaN(data.priceNet)) return { error: "Niepoprawna cena." };

  const fields = {
    name: data.name,
    sku: data.sku,
    ean: data.ean || null,
    description: data.description || null,
    unit: data.unit,
    priceNet: data.priceNet,
    purchasePrice: data.purchasePrice,
    vatRate: data.vatRate,
    minStock: data.minStock,
    isActive: data.isActive,
    // Kategoria: powiązanie z istniejącą lub utworzenie nowej
    category: data.category
      ? {
          connectOrCreate: {
            where: { name: data.category },
            create: { name: data.category },
          },
        }
      : productId
        ? { disconnect: true }
        : undefined,
  };

  let savedId: string;
  try {
    if (productId) {
      await prisma.product.update({ where: { id: productId }, data: fields });
      savedId = productId;
    } else {
      // Nowy produkt + ewentualny stan początkowy (jako dokument PZ) w jednej transakcji
      savedId = await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({ data: { ...fields, isActive: true } });
        if (data.initialQty && data.initialWarehouseId) {
          await recordMovement(tx, {
            type: "IN",
            productId: product.id,
            warehouseId: data.initialWarehouseId,
            quantity: data.initialQty,
            note: "Stan początkowy",
            createdBy: user.email,
          });
        }
        return product.id;
      });
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }

  // unieważnienie cache listy produktów
  revalidatePath("/produkty");
  redirect(`/produkty/${savedId}`);
}
