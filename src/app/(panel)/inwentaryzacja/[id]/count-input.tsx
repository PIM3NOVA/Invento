"use client";
// Pole ilości policzonej z bieżącym wyliczeniem różnicy.
import { useState } from "react";

export function CountInput({
  name,
  expected,
  defaultValue,
  disabled,
}: {
  name: string;
  expected: number;
  defaultValue: number | null;
  disabled: boolean;
}) {
  const [value, setValue] = useState(defaultValue === null ? "" : String(defaultValue));
  const diff = value === "" ? null : Number(value) - expected;

  return (
    <div className="flex items-center gap-3">
      <input
        name={name}
        type="number"
        min={0}
        inputMode="numeric" // klawiatura numeryczna
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="—"
        className="h-11 w-24 rounded-xl border border-line bg-surface-2 px-3 text-center text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
      />
      <span
        className={`w-14 text-right text-sm font-semibold tabular-nums ${
          diff === null || diff === 0 ? "text-muted" : diff > 0 ? "text-success" : "text-danger"
        }`}
      >
        {diff === null ? "" : diff > 0 ? `+${diff}` : diff}
      </span>
    </div>
  );
}
