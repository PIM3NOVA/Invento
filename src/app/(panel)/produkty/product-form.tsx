// Formularz produktu (dodawanie i edycja).
import type { Product, Warehouse } from "@/generated/prisma/client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { groszeToInput } from "@/lib/format";
import { VAT_RATES } from "@/lib/labels";
import { saveProduct } from "./actions";

export function ProductForm({
  product,
  categoryName,
  categories,
  warehouses,
}: {
  product?: Product;
  categoryName?: string;
  categories: string[];
  warehouses: Warehouse[];
}) {
  // powiązanie akcji z identyfikatorem produktu
  const action = saveProduct.bind(null, product?.id ?? null);

  return (
    <ActionForm action={action}>
      <Card>
        <h2 className="mb-4 font-semibold">Podstawowe informacje</h2>
        <FormGrid>
          <Field label="Nazwa produktu" className="md:col-span-2">
            <Input name="name" defaultValue={product?.name} required />
          </Field>
          <Field label="SKU (kod wewnętrzny)">
            <Input name="sku" defaultValue={product?.sku} required placeholder="np. KUB-001" />
          </Field>
          <Field label="EAN (kod kreskowy)" hint="Opcjonalnie">
            <Input name="ean" defaultValue={product?.ean ?? ""} inputMode="numeric" />
          </Field>
          <Field label="Kategoria" hint="Wybierz z listy albo wpisz nową">
            {/* podpowiedzi istniejących kategorii */}
            <Input name="category" list="categories" defaultValue={categoryName ?? ""} />
            <datalist id="categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Jednostka">
            <Input name="unit" defaultValue={product?.unit ?? "szt"} />
          </Field>
          <Field label="Opis" className="md:col-span-2">
            <Textarea name="description" defaultValue={product?.description ?? ""} />
          </Field>
        </FormGrid>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Ceny i magazyn</h2>
        <FormGrid>
          <Field label="Cena sprzedaży netto (zł)">
            <Input
              name="priceNet"
              inputMode="decimal" // klawiatura numeryczna na urządzeniach mobilnych
              defaultValue={product ? groszeToInput(product.priceNet) : ""}
              required
              placeholder="0,00"
            />
          </Field>
          <Field label="Stawka VAT">
            <Select name="vatRate" defaultValue={product?.vatRate ?? 23}>
              {VAT_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}%
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cena zakupu netto (zł)" hint="Do wyceny wartości magazynu">
            <Input
              name="purchasePrice"
              inputMode="decimal"
              defaultValue={product ? groszeToInput(product.purchasePrice) : ""}
              placeholder="0,00"
            />
          </Field>
          <Field label="Minimalny stan" hint="Poniżej tej ilości pojawi się alert">
            <Input name="minStock" type="number" min={0} defaultValue={product?.minStock ?? 0} />
          </Field>

          {/* Stan początkowy tylko przy dodawaniu nowego produktu */}
          {!product && warehouses.length > 0 && (
            <>
              <Field label="Stan początkowy" hint="Zostanie przyjęty dokumentem PZ">
                <Input name="initialQty" type="number" min={0} defaultValue={0} />
              </Field>
              <Field label="Do magazynu">
                <Select name="initialWarehouseId" defaultValue={warehouses.find((w) => w.isDefault)?.id}>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}

          {product && (
            <label className="flex min-h-11 items-center gap-3 md:col-span-2">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={product.isActive}
                className="size-5 accent-brand"
              />
              <span className="text-sm">Produkt aktywny (widoczny przy zamówieniach)</span>
            </label>
          )}
        </FormGrid>
      </Card>

      <div className="flex justify-end">
        <SubmitButton className="w-full md:w-auto">
          {product ? "Zapisz zmiany" : "Dodaj produkt"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
