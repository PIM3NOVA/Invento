// Strona logowania (/login); ?tryb=rejestracja przełącza na rejestrację.
import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { authenticate } from "./actions";

export const metadata: Metadata = { title: "Logowanie" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { tryb } = await searchParams;
  const isRegister = tryb === "rejestracja";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      {/* Dekoracyjna poświata tła */}
      <div className="pointer-events-none absolute -top-40 left-1/2 size-144 -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]" />

      <div className="relative w-full max-w-md rounded-card border border-line bg-surface/90 p-6 shadow-2xl backdrop-blur md:p-8">
        <div className="mb-8 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-11" />
          <div>
            <p className="text-xl font-semibold">
              Invento<span className="text-brand">.</span>
            </p>
            <p className="text-sm text-muted">Magazyn · Zamówienia · Faktury</p>
          </div>
        </div>

        <h1 className="mb-6 text-2xl font-semibold">
          {isRegister ? "Załóż konto" : "Zaloguj się"}
        </h1>

        <ActionForm action={authenticate}>
          <input type="hidden" name="mode" value={isRegister ? "register" : "login"} />
          <Field label="E-mail">
            <Input name="email" type="email" autoComplete="email" required placeholder="jan@firma.pl" />
          </Field>
          <Field label="Hasło">
            <PasswordInput
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={6}
            />
          </Field>
          {/* Potwierdzenie hasła (rejestracja) */}
          {isRegister && (
            <Field label="Powtórz hasło">
              <PasswordInput name="passwordConfirm" autoComplete="new-password" required minLength={6} />
            </Field>
          )}
          <SubmitButton pendingText="Chwileczkę…" className="w-full">
            {isRegister ? "Utwórz konto" : "Zaloguj"}
          </SubmitButton>
        </ActionForm>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? "Masz już konto? " : "Nie masz konta? "}
          <Link
            href={isRegister ? "/login" : "/login?tryb=rejestracja"}
            className="font-medium text-brand-light hover:underline"
          >
            {isRegister ? "Zaloguj się" : "Zarejestruj się"}
          </Link>
        </p>
      </div>
    </main>
  );
}
