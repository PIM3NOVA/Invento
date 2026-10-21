// Pola formularzy: Field (etykieta), Input, Select, Textarea, FormGrid.
import type { ComponentProps, ReactNode } from "react";

// text-base (16 px) na urządzeniach mobilnych zapobiega automatycznemu powiększaniu strony
const fieldClass =
  "w-full min-h-11 rounded-xl border border-line bg-surface-2 px-4 text-base md:text-sm text-fg placeholder:text-muted/60 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-fg/90">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${fieldClass} pr-8 ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${fieldClass} min-h-24 py-3 ${className}`} {...props} />;
}

// Siatka pól: 1 kolumna (mobile), 2 kolumny (desktop)
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
