"use server";
// Server Actions modułu magazynów.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorMessage, parseForm, type ActionState } from "@/lib/action-state";

const warehouseSchema = z.object({
  name: z.string().trim().min(2, "Podaj nazwę magazynu."),
  code: z.string().trim().min(1, "Podaj kod magazynu.").toUpperCase(),
  address: z.string().trim().optional(),
  isDefault: z.string().optional().transform((v) => v === "on"),
});

export async function saveWarehouse(
  warehouseId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const { ok, data, error } = parseForm(warehouseSchema, formData);
  if (!ok) return { error };

  const fields = { ...data, address: data.address || null };

  try {
    await prisma.$transaction(async (tx) => {
      // Tylko jeden magazyn może być domyślny
      if (data.isDefault) {
        await tx.warehouse.updateMany({ data: { isDefault: false } });
      }
      if (warehouseId) {
        await tx.warehouse.update({ where: { id: warehouseId }, data: fields });
      } else {
        await tx.warehouse.create({ data: fields });
      }
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/magazyny");
  redirect("/magazyny");
}
