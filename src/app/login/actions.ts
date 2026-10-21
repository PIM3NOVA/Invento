"use server";
// Akcje uwierzytelniania: logowanie, rejestracja, wylogowanie.
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseForm, type ActionState } from "@/lib/action-state";

const credentialsSchema = z
  .object({
    email: z.email("Podaj poprawny adres e-mail."),
    password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków."),
    // wymagane tylko przy rejestracji
    passwordConfirm: z.string().optional(),
    mode: z.enum(["login", "register"]),
  })
  // zgodność haseł przy rejestracji
  .refine((data) => data.mode === "login" || data.password === data.passwordConfirm, {
    message: "Hasła nie są takie same.",
  });

export async function authenticate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ok, data, error } = parseForm(credentialsSchema, formData);
  if (!ok) return { error };

  const supabase = await createSupabaseServerClient();

  if (data.mode === "register") {
    // Rejestracja nowego konta w Supabase Auth
    const { data: signUp, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (signUpError) return { error: signUpError.message };
    // brak sesji oznacza wymagane potwierdzenie adresu e-mail
    if (!signUp.session) {
      return { success: "Konto utworzone. Sprawdź skrzynkę i kliknij link potwierdzający." };
    }
  } else {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (signInError) return { error: "Nieprawidłowy e-mail lub hasło." };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
