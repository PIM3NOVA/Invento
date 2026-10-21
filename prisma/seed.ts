// Dane przykładowe (seed) – wypełnia bazę danymi demonstracyjnymi.
// Uruchomienie: npm run db:seed. Uwaga: skrypt czyści wszystkie tabele.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { OrderStatus, PaymentMethod, SalesChannel } from "../src/generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

// Generator pseudolosowy ze stałym ziarnem – powtarzalne dane przy każdym uruchomieniu.
let seed = 42;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
const between = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;

const ym = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const counters: Record<string, number> = {};
const docNo = (prefix: string, date: Date) => {
  const key = `${prefix}/${ym(date)}`;
  counters[key] = (counters[key] ?? 0) + 1;
  return `${key}/${String(counters[key]).padStart(4, "0")}`;
};

async function main() {
  console.log("Czyszczenie bazy…");
  await prisma.$transaction([
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.inventoryCountItem.deleteMany(),
    prisma.inventoryCount.deleteMany(),
    prisma.stockLevel.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.warehouse.deleteMany(),
    prisma.company.deleteMany(),
  ]);

  console.log("Firma i magazyny…");
  const company = await prisma.company.create({
    data: {
      name: "Magenta Home Sp. z o.o.",
      nip: "5252812345",
      street: "ul. Marszałkowska 10/4",
      postalCode: "00-590",
      city: "Warszawa",
      email: "biuro@magentahome.pl",
      phone: "+48 600 100 200",
      bankAccount: "PL61 1090 1014 0000 0712 1981 2874",
    },
  });

  const mainWarehouse = await prisma.warehouse.create({
    data: { name: "Magazyn główny", code: "WAW-1", address: "ul. Magazynowa 5, 05-500 Piaseczno", isDefault: true },
  });
  const shop = await prisma.warehouse.create({
    data: { name: "Sklep stacjonarny", code: "WAW-SKL", address: "ul. Marszałkowska 10, Warszawa" },
  });

  console.log("Produkty…");
  const catalog: [string, string, string, number, number, number][] = [
    // [kategoria, SKU, nazwa, cena netto (zł), cena zakupu (zł), min. stan]
    ["Kubki", "KUB-001", "Kubek ceramiczny Magenta 350 ml", 29.99, 11.5, 20],
    ["Kubki", "KUB-002", "Kubek termiczny Black 450 ml", 59.0, 24.0, 10],
    ["Kubki", "KUB-003", "Zestaw filiżanek espresso 4 szt.", 79.0, 31.0, 5],
    ["Świece", "SWI-001", "Świeca sojowa Wanilia 200 g", 39.0, 12.0, 15],
    ["Świece", "SWI-002", "Świeca sojowa Drzewo sandałowe 200 g", 39.0, 12.0, 15],
    ["Świece", "SWI-003", "Świecznik metalowy czarny", 49.0, 18.0, 8],
    ["Tekstylia", "TEK-001", "Poduszka welurowa fuksja 45×45", 69.0, 26.0, 10],
    ["Tekstylia", "TEK-002", "Koc z mikrofibry grafit 150×200", 119.0, 48.0, 6],
    ["Tekstylia", "TEK-003", "Bieżnik lniany 40×140", 45.0, 16.0, 5],
    ["Dekoracje", "DEK-001", "Wazon szklany różowy 25 cm", 89.0, 34.0, 4],
    ["Dekoracje", "DEK-002", "Ramka na zdjęcia 13×18 czarna", 25.0, 8.0, 12],
    ["Dekoracje", "DEK-003", "Lustro okrągłe 50 cm złota rama", 199.0, 85.0, 3],
    ["Kuchnia", "KUC-001", "Deska do krojenia dębowa", 79.0, 30.0, 6],
    ["Kuchnia", "KUC-002", "Zestaw przypraw w słoiczkach 6 szt.", 65.0, 22.0, 8],
    ["Kuchnia", "KUC-003", "Fartuch kuchenny bawełniany", 49.0, 15.0, 10],
  ];

  const products = [];
  for (const [category, sku, name, price, purchase, minStock] of catalog) {
    products.push(
      await prisma.product.create({
        data: {
          sku,
          name,
          ean: `590${String(between(1e9, 9e9))}`,
          priceNet: Math.round(price * 100),
          purchasePrice: Math.round(purchase * 100),
          minStock,
          category: { connectOrCreate: { where: { name: category }, create: { name: category } } },
        },
      }),
    );
  }

  // Stany: przyjęcie PZ do magazynu głównego 30 dni temu + część do sklepu
  const qty = new Map<string, number>(); // klucz: productId:warehouseId
  const addQty = (productId: string, warehouseId: string, delta: number) =>
    qty.set(`${productId}:${warehouseId}`, (qty.get(`${productId}:${warehouseId}`) ?? 0) + delta);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const pzNo = docNo("PZ", startDate);

  for (const p of products) {
    const amount = between(p.minStock + 15, p.minStock + 80);
    addQty(p.id, mainWarehouse.id, amount);
    await prisma.stockMovement.create({
      data: { documentNo: pzNo, type: "IN", quantity: amount, productId: p.id, warehouseId: mainWarehouse.id, note: "Dostawa – stan początkowy", createdAt: startDate },
    });
  }
  const mmNo = docNo("MM", startDate);
  for (const p of products.slice(0, 8)) {
    const amount = between(3, 10);
    addQty(p.id, mainWarehouse.id, -amount);
    addQty(p.id, shop.id, amount);
    await prisma.stockMovement.create({
      data: { documentNo: mmNo, type: "TRANSFER", quantity: amount, productId: p.id, warehouseId: mainWarehouse.id, targetWarehouseId: shop.id, createdAt: startDate },
    });
  }

  console.log("Kontrahenci…");
  const customerData = [
    { name: "Anna Kowalska", street: "ul. Lipowa 3/12", postalCode: "30-001", city: "Kraków", email: "anna.kowalska@example.com" },
    { name: "Piotr Nowak", street: "ul. Słoneczna 8", postalCode: "80-210", city: "Gdańsk", email: "p.nowak@example.com" },
    { name: "Studio Wnętrz Aurora s.c.", nip: "6762456789", street: "ul. Długa 44", postalCode: "31-147", city: "Kraków", email: "kontakt@aurora-wnetrza.pl" },
    { name: "Kawiarnia Pod Lipami", nip: "7792345678", street: "Rynek 2", postalCode: "61-772", city: "Poznań", email: "kawiarnia@podlipami.pl" },
    { name: "Marta Wiśniewska", street: "ul. Polna 17", postalCode: "50-001", city: "Wrocław", email: "marta.w@example.com" },
    { name: "Hotel Panorama Sp. z o.o.", nip: "5213456712", street: "al. Jerozolimskie 120", postalCode: "02-017", city: "Warszawa", email: "zakupy@hotelpanorama.pl" },
    { name: "Tomasz Zieliński", street: "ul. Ogrodowa 5", postalCode: "90-001", city: "Łódź", email: "t.zielinski@example.com" },
  ];
  const customers = [];
  for (const c of customerData) customers.push(await prisma.customer.create({ data: c }));

  console.log("Zamówienia i faktury…");
  const channels: SalesChannel[] = ["SHOP", "SHOP", "ALLEGRO", "ALLEGRO", "OLX", "STORE", "PHONE"];
  const payments: PaymentMethod[] = ["TRANSFER", "TRANSFER", "CARD", "COD"];

  // Daty zamówień posortowane rosnąco – numeracja dokumentów zgodna z chronologią.
  // Część zamówień starsza niż 14 dni – faktury przelewowe mogą być po terminie.
  const orderDates = Array.from({ length: 32 }, () => {
    const d = new Date();
    d.setDate(d.getDate() - between(0, 20));
    d.setHours(between(8, 21), between(0, 59));
    return d;
  }).sort((a, b) => a.getTime() - b.getTime());

  for (const created of orderDates) {
    const customer = pick(customers);
    const channel = customer.nip ? "PHONE" : pick(channels);
    const warehouse = channel === "STORE" ? shop : mainWarehouse;
    const paymentMethod = channel === "STORE" ? "CASH" : pick(payments);
    // starsze zamówienia częściej są już wysłane/doręczone
    const age = (Date.now() - created.getTime()) / 86_400_000;
    const status: OrderStatus =
      age > 6 ? pick(["DELIVERED", "DELIVERED", "SHIPPED", "CANCELLED"]) : age > 2 ? pick(["SHIPPED", "PAID", "DELIVERED"]) : pick(["NEW", "PAID", "NEW"]);

    // 1–4 różne produkty, dostępne w wybranym magazynie
    const available = products.filter((p) => (qty.get(`${p.id}:${warehouse.id}`) ?? 0) >= 4);
    const lines = [...new Set(Array.from({ length: between(1, 4) }, () => pick(available)))].map((p) => ({
      product: p,
      quantity: between(1, customer.nip ? 4 : 2),
    }));

    const order = await prisma.order.create({
      data: {
        number: docNo("ZAM", created),
        status,
        channel,
        paymentMethod,
        createdAt: created,
        customerId: customer.id,
        warehouseId: warehouse.id,
        shippedAt: status === "SHIPPED" || status === "DELIVERED" ? created : null,
        items: {
          create: lines.map(({ product, quantity }) => ({
            productId: product.id,
            name: product.name,
            quantity,
            priceNet: product.priceNet,
            vatRate: product.vatRate,
          })),
        },
      },
    });

    if (status === "SHIPPED" || status === "DELIVERED") {
      const wz = docNo("WZ", created);
      for (const { product, quantity } of lines) {
        addQty(product.id, warehouse.id, -quantity);
        await prisma.stockMovement.create({
          data: { documentNo: wz, type: "OUT", quantity, productId: product.id, warehouseId: warehouse.id, orderId: order.id, note: `Wysyłka zamówienia ${order.number}`, createdAt: created },
        });
      }

      // Faktura dla wysłanych zamówień
      const items = lines.map(({ product, quantity }) => {
        const net = quantity * product.priceNet;
        const vat = Math.round((net * product.vatRate) / 100);
        return { name: product.name, unit: product.unit, quantity, priceNet: product.priceNet, vatRate: product.vatRate, net, vat, gross: net + vat };
      });
      const sum = (key: "net" | "vat" | "gross") => items.reduce((s, it) => s + it[key], 0);
      const due = new Date(created);
      due.setDate(due.getDate() + (paymentMethod === "TRANSFER" ? 14 : 0));

      await prisma.invoice.create({
        data: {
          number: docNo("FV", created),
          issueDate: created,
          saleDate: created,
          dueDate: due,
          paymentMethod,
          // przelew: starsze opłacone, z ostatnich 15–18 dni po terminie, najnowsze częściowo w terminie;
          // pobranie: opłacone po doręczeniu
          isPaid:
            paymentMethod === "TRANSFER"
              ? age > 18 || (age <= 14 && random() > 0.5)
              : paymentMethod !== "COD" || status === "DELIVERED",
          sellerName: company.name,
          sellerNip: company.nip,
          sellerAddress: `${company.street}, ${company.postalCode} ${company.city}`,
          sellerBank: company.bankAccount,
          buyerName: customer.name,
          buyerNip: customer.nip,
          buyerAddress: `${customer.street}, ${customer.postalCode} ${customer.city}`,
          totalNet: sum("net"),
          totalVat: sum("vat"),
          totalGross: sum("gross"),
          customerId: customer.id,
          orderId: order.id,
          createdAt: created,
          items: { create: items },
        },
      });
    }
  }

  // Dwa produkty z niskim stanem (demonstracja alertów)
  for (const p of products.slice(-2)) {
    const key = `${p.id}:${mainWarehouse.id}`;
    const current = qty.get(key) ?? 0;
    const target = Math.max(0, p.minStock - 2);
    if (current <= target) continue;
    const wz = docNo("WZ", new Date());
    addQty(p.id, mainWarehouse.id, target - current);
    await prisma.stockMovement.create({
      data: { documentNo: wz, type: "OUT", quantity: current - target, productId: p.id, warehouseId: mainWarehouse.id, note: "Sprzedaż hurtowa" },
    });
  }

  // Zapis końcowych stanów
  await prisma.stockLevel.createMany({
    data: [...qty.entries()].map(([key, quantity]) => {
      const [productId, warehouseId] = key.split(":");
      return { productId, warehouseId, quantity };
    }),
  });

  console.log("✔ Gotowe! Dane przykładowe wgrane.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
