"use client";
// Pole hasła z przełącznikiem widoczności.
import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./form";

export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {/* przełączanie typu pola password/text */}
      <Input {...props} type={visible ? "text" : "password"} className="pr-12" />
      <button
        type="button" // nie wysyła formularza
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ukryj hasło" : "Pokaż hasło"}
        className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-muted hover:text-brand"
      >
        {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
