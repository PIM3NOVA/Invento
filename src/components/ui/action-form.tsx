"use client";
// Formularz powiązany z Server Action: wysyłka danych, komunikaty zwrotne
// oraz stan oczekiwania przekazywany do SubmitButton.
import { createContext, startTransition, useActionState, useContext, type ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";
import { Button } from "./button";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

// Stan wysyłania formularza (dla SubmitButton)
const PendingContext = createContext(false);

export function ActionForm({
  action,
  children,
  className = "",
}: {
  action: Action;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form
      action={formAction}
      className={`flex flex-col gap-5 ${className}`}
      // Ręczne wywołanie akcji zapobiega automatycznemu resetowi formularza
      // przez React 19 – dane pozostają w polach po błędzie walidacji.
      onSubmit={(event) => {
        event.preventDefault();
        // przekazanie name/value klikniętego przycisku (np. intent=close)
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const formData = new FormData(event.currentTarget, submitter);
        startTransition(() => formAction(formData));
      }}
    >
      {state.error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          {state.success}
        </p>
      )}
      <PendingContext.Provider value={isPending}>{children}</PendingContext.Provider>
    </form>
  );
}

// Przycisk wysyłający z obsługą stanu oczekiwania
export function SubmitButton({
  children,
  pendingText = "Zapisywanie…",
  variant = "primary",
  className = "",
  name,
  value,
  confirm,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  name?: string; // name/value przekazywane do FormData
  value?: string;
  confirm?: string; // pytanie wyświetlane przed wykonaniem nieodwracalnej akcji
}) {
  const pending = useContext(PendingContext);
  return (
    <Button
      type="submit"
      name={name}
      value={value}
      variant={variant}
      disabled={pending}
      className={className}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
