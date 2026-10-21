// Konfiguracja Prisma CLI (migracje, seed). Zmienne środowiskowe ładowane z .env.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // skrypt danych przykładowych (npx prisma db seed)
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migracje korzystają z połączenia sesyjnego (port 5432) – pooler
    // transakcyjny Supabase (port 6543) nie obsługuje wszystkich operacji DDL.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
