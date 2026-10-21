// Formularz kontrahenta (dodawanie i edycja)
import type { Customer } from "@/generated/prisma/client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, FormGrid, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { saveCustomer } from "./actions";

export function CustomerForm({ customer }: { customer?: Customer }) {
  const action = saveCustomer.bind(null, customer?.id ?? null);

  return (
    <ActionForm action={action}>
      <Card>
        <FormGrid>
          <Field label="Nazwa firmy / imię i nazwisko" className="md:col-span-2">
            <Input name="name" defaultValue={customer?.name} required autoComplete="organization" />
          </Field>
          <Field label="NIP" hint="Zostaw puste dla osoby prywatnej">
            <Input name="nip" defaultValue={customer?.nip ?? ""} inputMode="numeric" />
          </Field>
          <Field label="E-mail">
            <Input name="email" type="email" defaultValue={customer?.email ?? ""} />
          </Field>
          <Field label="Telefon">
            <Input name="phone" type="tel" defaultValue={customer?.phone ?? ""} />
          </Field>
          <Field label="Ulica i numer">
            <Input name="street" defaultValue={customer?.street} required autoComplete="street-address" />
          </Field>
          <Field label="Kod pocztowy">
            <Input name="postalCode" defaultValue={customer?.postalCode} required placeholder="00-000" />
          </Field>
          <Field label="Miasto">
            <Input name="city" defaultValue={customer?.city} required />
          </Field>
          <Field label="Kraj">
            <Input name="country" defaultValue={customer?.country ?? "Polska"} required />
          </Field>
        </FormGrid>
      </Card>
      <div className="flex justify-end">
        <SubmitButton className="w-full md:w-auto">
          {customer ? "Zapisz zmiany" : "Dodaj kontrahenta"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
