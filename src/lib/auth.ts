// Uwierzytelnianie po stronie serwera. requireUser() wywoływane jest w każdej
// Server Action modyfikującej dane (akcje są publicznymi punktami końcowymi).
import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

// Zwraca zalogowanego użytkownika lub null
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  // getClaims() weryfikuje podpis tokenu JWT
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return { id: claims.sub, email: String(claims.email ?? "") };
}

// Zwraca użytkownika lub przekierowuje na /login
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
