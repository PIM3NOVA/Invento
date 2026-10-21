"use server";
// Server Actions modułu zamówień: tworzenie i zmiana statusu.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { OrderStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorMessage, parseForm, type ActionState } from "@/lib/action-state";
import { nextDocumentNumber } from "@/lib/numbering";
import { nextMovementNumber, recordMovement } from "@/lib/stock";

// Pozycje zamówienia przesyłane jako JSON w ukrytym polu "items".
const itemsSchema = z
  .array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() }))
  .min(1, "Dodaj przynajmniej jeden produkt.");

const orderSchema = z.object({
  customerId: z.string().min(1, "Wybierz klienta."),
  warehouseId: z.string().min(1, "Wybierz magazyn."),
  channel: z.enum(["SHOP", "ALLEGRO", "OLX", "STORE", "PHONE"]),
  paymentMethod: z.enum(["TRANSFER", "CARD", "CASH", "COD"]),
  note: z.string().trim().optional(),
  items: z.string().transform((text, ctx) => {
    try {
      return itemsSchema.parse(JSON.parse(text));
    } catch {
      ctx.addIssue({ code: "custom", message: "Dodaj przynajmniej jeden produkt z ilością." });
      return z.NEVER;
    }
  }),
});

export async function createOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const { ok, data, error } = parseForm(orderSchema, formData);
  if (!ok) return { error };

  let orderId: string;
  try {
    // Ceny i nazwy pobierane z bazy (dane z klienta nie są zaufane)
    const products = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) } },
    });

    const number = await nextDocumentNumber("ZAM", async (startsWith) => {
      const last = await prisma.order.findFirst({
        where: { number: { startsWith } },
        orderBy: { number: "desc" },
      });
      return last?.number;
    });

    const order = await prisma.order.create({
      data: {
        number,
        customerId: data.customerId,
        warehouseId: data.warehouseId,
        channel: data.channel,
        paymentMethod: data.paymentMethod,
        note: data.note || null,
        items: {
          create: data.items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) throw new Error("Wybrany produkt nie istnieje.");
            return {
              productId: product.id,
              name: product.name,
              quantity: item.quantity,
              priceNet: product.priceNet,
              vatRate: product.vatRate,
            };
          }),
        },
      },
    });
    orderId = order.id;
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/zamowienia");
  redirect(`/zamowienia/${orderId}`);
}

// Dozwolone przejścia między statusami zamówienia
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["PAID", "SHIPPED", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function changeOrderStatus(
  orderId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const newStatus = formData.get("status") as OrderStatus;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });

      if (!ALLOWED[order.status].includes(newStatus)) {
        throw new Error("Takiej zmiany statusu nie można wykonać.");
      }

      // Wysyłka: dokument WZ dla pozycji zamówienia; brak towaru wycofuje transakcję.
      if (newStatus === "SHIPPED") {
        const documentNo = await nextMovementNumber(tx, "OUT");
        for (const item of order.items) {
          await recordMovement(tx, {
            type: "OUT",
            productId: item.productId,
            warehouseId: order.warehouseId,
            quantity: item.quantity,
            documentNo,
            orderId: order.id,
            note: `Wysyłka zamówienia ${order.number}`,
            createdBy: user.email,
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          ...(newStatus === "SHIPPED" && { shippedAt: new Date() }),
        },
      });
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath(`/zamowienia/${orderId}`);
  revalidatePath("/zamowienia");
  return {};
}
