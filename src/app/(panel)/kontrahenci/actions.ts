"use server";
// Server Actions modułu kontrahentów.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorMessage, parseForm, type ActionState } from "@/lib/action-state";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Podaj nazwę lub imię i nazwisko."),
  // NIP: normalizacja i walidacja (10 cyfr lub brak)
  nip: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => v === "" || /^\d{10}$/.test(v), "NIP musi mieć 10 cyfr."),
  email: z.union([z.literal(""), z.email("Niepoprawny e-mail.")]),
  phone: z.string().trim(),
  street: z.string().trim().min(2, "Podaj ulicę i numer."),
  postalCode: z.string().trim().regex(/^\d{2}-\d{3}$/, "Kod pocztowy w formacie 00-000."),
  city: z.string().trim().min(2, "Podaj miasto."),
  country: z.string().trim().min(2),
});

export async function saveCustomer(
  customerId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const { ok, data, error } = parseForm(customerSchema, formData);
  if (!ok) return { error };

  // puste wartości zapisywane jako null
  const fields = { ...data, nip: data.nip || null, email: data.email || null, phone: data.phone || null };

  let savedId: string;
  try {
    const customer = customerId
      ? await prisma.customer.update({ where: { id: customerId }, data: fields })
      : await prisma.customer.create({ data: fields });
    savedId = customer.id;
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/kontrahenci");
  redirect(`/kontrahenci/${savedId}`);
}
