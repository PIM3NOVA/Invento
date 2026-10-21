// Lista kontrahentów (/kontrahenci); wyszukiwanie: ?q=
import type { Metadata } from "next";
import Form from "next/form";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { DataTable } from "@/components/ui/data-table";

export const metadata: Metadata = { title: "Kontrahenci" };

export default async function CustomersPage({ searchParams }: PageProps<"/kontrahenci">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const customers = await prisma.customer.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { nip: { contains: query } },
            { email: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    // liczba zamówień kontrahenta
    include: { _count: { select: { orders: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Kontrahenci"
        description="Klienci, dla których realizujesz zamówienia i wystawiasz faktury."
        actions={
          <ButtonLink href="/kontrahenci/nowy">
            <Plus className="size-4" /> Dodaj kontrahenta
          </ButtonLink>
        }
      />

      <Form action="/kontrahenci" className="relative mb-5">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
        <Input name="q" defaultValue={query} placeholder="Szukaj po nazwie, NIP, e-mailu, mieście…" className="pl-11" />
      </Form>

      {customers.length === 0 ? (
        <EmptyState title="Brak kontrahentów" />
      ) : (
        <DataTable
          rows={customers}
          getKey={(c) => c.id}
          href={(c) => `/kontrahenci/${c.id}`}
          columns={[
            { header: "Nazwa", cell: (c) => c.name },
            { header: "NIP", cell: (c) => c.nip ?? "osoba prywatna" },
            { header: "Miasto", cell: (c) => c.city },
            { header: "E-mail", cell: (c) => c.email ?? "—", hideOnMobile: true },
            { header: "Zamówienia", cell: (c) => c._count.orders, align: "right" },
          ]}
        />
      )}
    </>
  );
}
