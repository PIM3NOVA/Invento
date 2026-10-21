// Klient Prisma współdzielony w całej aplikacji.
import "server-only"; // moduł wyłącznie serwerowy
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  // Prisma 7 wymaga adaptera sterownika – PostgreSQL (pg)
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// W trybie deweloperskim (hot reload) klient przechowywany jest w globalThis,
// aby nie tworzyć nowych połączeń przy każdym przeładowaniu modułów.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
