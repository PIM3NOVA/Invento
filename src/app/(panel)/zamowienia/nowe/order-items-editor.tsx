"use client";
// Edytor pozycji zamówienia z bieżącym przeliczaniem sum.
// Pozycje serializowane są do ukrytego pola "items" (JSON).
import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { calcTotals } from "@/lib/invoice-math";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export type ProductOption = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  priceNet: number;
  vatRate: number;
};

type Line = { productId: string; quantity: number };

export function OrderItemsEditor({ products }: { products: ProductOption[] }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [selected, setSelected] = useState("");

  const findProduct = (id: string) => products.find((p) => p.id === id)!;

  function addLine() {
    if (!selected) return;
    setLines((current) =>
      // ponowne dodanie produktu zwiększa ilość
      current.some((l) => l.productId === selected)
        ? current.map((l) => (l.productId === selected ? { ...l, quantity: l.quantity + 1 } : l))
        : [...current, { productId: selected, quantity: 1 }],
    );
    setSelected("");
  }

  function setQuantity(productId: string, quantity: number) {
    setLines((current) =>
      current.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(1, quantity) } : l)),
    );
  }

  function removeLine(productId: string) {
    setLines((current) => current.filter((l) => l.productId !== productId));
  }

  const totals = calcTotals(
    lines.map((l) => {
      const p = findProduct(l.productId);
      return { quantity: l.quantity, priceNet: p.priceNet, vatRate: p.vatRate };
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="items" value={JSON.stringify(lines)} />

      {/* Wybór produktu */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1">
          <option value="">— wybierz produkt —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku}) – {formatMoney(p.priceNet)} netto
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" onClick={addLine} disabled={!selected}>
          <Plus className="size-4" /> Dodaj
        </Button>
      </div>

      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Brak pozycji. Wybierz produkt i kliknij „Dodaj”.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lines.map((line) => {
            const p = findProduct(line.productId);
            return (
              <li
                key={line.productId}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 p-3"
              >
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted">
                    {formatMoney(p.priceNet)} netto · VAT {p.vatRate}%
                  </p>
                </div>
                {/* Zmiana ilości */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(p.id, line.quantity - 1)}
                    className="flex size-10 items-center justify-center rounded-full border border-line hover:border-brand"
                    aria-label="Mniej"
                  >
                    <Minus className="size-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(e) => setQuantity(p.id, Number(e.target.value))}
                    className="h-10 w-16 rounded-xl border border-line bg-surface text-center text-base outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(p.id, line.quantity + 1)}
                    className="flex size-10 items-center justify-center rounded-full border border-line hover:border-brand"
                    aria-label="Więcej"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <p className="w-24 text-right text-sm font-semibold tabular-nums">
                  {formatMoney(line.quantity * p.priceNet)}
                </p>
                <button
                  type="button"
                  onClick={() => removeLine(p.id)}
                  className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-danger/15 hover:text-danger"
                  aria-label="Usuń pozycję"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Podsumowanie */}
      <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm">
        <dt className="text-muted">Netto</dt>
        <dd className="text-right tabular-nums">{formatMoney(totals.net)}</dd>
        <dt className="text-muted">VAT</dt>
        <dd className="text-right tabular-nums">{formatMoney(totals.vat)}</dd>
        <dt className="font-semibold">Brutto</dt>
        <dd className="text-right text-lg font-semibold text-brand tabular-nums">{formatMoney(totals.gross)}</dd>
      </dl>
    </div>
  );
}
