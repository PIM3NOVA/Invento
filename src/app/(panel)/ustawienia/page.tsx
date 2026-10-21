// Ustawienia firmy (/ustawienia) – dane sprzedawcy na fakturach.
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, FormGrid, Input } from "@/components/ui/form";
import { saveCompany } from "./actions";

export const metadata: Metadata = { title: "Ustawienia firmy" };

export default async function SettingsPage() {
  const company = await prisma.company.findUnique({ where: { id: 1 } });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ustawienia firmy" description="Te dane pojawiają się na fakturach jako dane sprzedawcy." />
      <ActionForm action={saveCompany}>
        <Card>
          <CardTitle>Dane do faktury</CardTitle>
          <FormGrid>
            <Field label="Pełna nazwa firmy" className="md:col-span-2">
              <Input name="name" defaultValue={company?.name} required />
            </Field>
            <Field label="NIP">
              <Input name="nip" defaultValue={company?.nip} required inputMode="numeric" />
            </Field>
            <Field label="Ulica i numer">
              <Input name="street" defaultValue={company?.street} required />
            </Field>
            <Field label="Kod pocztowy">
              <Input name="postalCode" defaultValue={company?.postalCode} required placeholder="00-000" />
            </Field>
            <Field label="Miasto">
              <Input name="city" defaultValue={company?.city} required />
            </Field>
            <Field label="E-mail">
              <Input name="email" type="email" defaultValue={company?.email ?? ""} />
            </Field>
            <Field label="Telefon">
              <Input name="phone" type="tel" defaultValue={company?.phone ?? ""} />
            </Field>
            <Field label="Numer konta bankowego" className="md:col-span-2">
              <Input name="bankAccount" defaultValue={company?.bankAccount ?? ""} placeholder="PL00 0000 0000 0000 0000 0000 0000" />
            </Field>
          </FormGrid>
        </Card>
        <Card>
          <CardTitle>Numeracja</CardTitle>
          <Field label="Prefiks numeru faktury" hint="Np. FV → FV/2026/10/0001">
            <Input name="invoicePrefix" defaultValue={company?.invoicePrefix ?? "FV"} maxLength={6} />
          </Field>
        </Card>
        <div className="flex justify-end">
          <SubmitButton className="w-full md:w-auto">Zapisz</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
