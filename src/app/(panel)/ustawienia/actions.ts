"use server";
// Server Action: zapis danych firmy (sprzedawcy).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorMessage, parseForm, type ActionState } from "@/lib/action-state";

const companySchema = z.object({
  name: z.string().trim().min(2, "Podaj nazwę firmy."),
  nip: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => /^\d{10}$/.test(v), "NIP musi mieć 10 cyfr."),
  street: z.string().trim().min(2, "Podaj adres."),
  postalCode: z.string().trim().regex(/^\d{2}-\d{3}$/, "Kod pocztowy w formacie 00-000."),
  city: z.string().trim().min(2, "Podaj miasto."),
  email: z.string().trim(),
  phone: z.string().trim(),
  bankAccount: z.string().trim(),
  invoicePrefix: z.string().trim().min(1).max(6).toUpperCase(),
});

export async function saveCompany(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const { ok, data, error } = parseForm(companySchema, formData);
  if (!ok) return { error };

  const fields = {
    ...data,
    email: data.email || null,
    phone: data.phone || null,
    bankAccount: data.bankAccount || null,
  };

  try {
    // pojedynczy rekord firmy (id = 1)
    await prisma.company.upsert({ where: { id: 1 }, create: { id: 1, ...fields }, update: fields });
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/ustawienia");
  return { success: "Zapisano dane firmy." };
}
