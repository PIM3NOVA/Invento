// Formularz magazynu (dodawanie i edycja)
import type { Warehouse } from "@/generated/prisma/client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, FormGrid, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { saveWarehouse } from "./actions";

export function WarehouseForm({ warehouse }: { warehouse?: Warehouse }) {
  const action = saveWarehouse.bind(null, warehouse?.id ?? null);

  return (
    <ActionForm action={action}>
      <Card>
        <FormGrid>
          <Field label="Nazwa">
            <Input name="name" defaultValue={warehouse?.name} required placeholder="Magazyn główny" />
          </Field>
          <Field label="Kod" hint="Krótki identyfikator, np. WAW-1">
            <Input name="code" defaultValue={warehouse?.code} required />
          </Field>
          <Field label="Adres" className="md:col-span-2">
            <Input name="address" defaultValue={warehouse?.address ?? ""} />
          </Field>
          <label className="flex min-h-11 items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              name="isDefault"
              defaultChecked={warehouse?.isDefault}
              className="size-5 accent-brand"
            />
            <span className="text-sm">Magazyn domyślny (podpowiadany przy zamówieniach)</span>
          </label>
        </FormGrid>
      </Card>
      <div className="flex justify-end">
        <SubmitButton className="w-full md:w-auto">
          {warehouse ? "Zapisz zmiany" : "Dodaj magazyn"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
