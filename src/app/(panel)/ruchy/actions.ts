"use server";
// Server Action: ręczny dokument magazynowy (PZ / WZ / MM)
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorMessage, parseForm, type ActionState } from "@/lib/action-state";
import { recordMovement } from "@/lib/stock";

const movementSchema = z.object({
  type: z.enum(["IN", "OUT", "TRANSFER"]), // ADJUST wyłącznie z inwentaryzacji
  productId: z.string().min(1, "Wybierz produkt."),
  warehouseId: z.string().min(1, "Wybierz magazyn."),
  targetWarehouseId: z.string().optional(),
  quantity: z.coerce.number().int().positive("Ilość musi być większa od zera."),
  note: z.string().trim().optional(),
});

export async function createMovement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { ok, data, error } = parseForm(movementSchema, formData);
  if (!ok) return { error };

  try {
    await prisma.$transaction((tx) =>
      recordMovement(tx, { ...data, createdBy: user.email }),
    );
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/ruchy");
  revalidatePath(`/produkty/${data.productId}`);
  redirect("/ruchy");
}
