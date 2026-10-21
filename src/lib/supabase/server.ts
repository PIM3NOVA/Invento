// Serwerowy klient Supabase – uwierzytelnianie (Supabase Auth).
// Dostęp do danych biznesowych realizowany jest przez Prisma.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // Obsługa ciasteczek sesji
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Zapis ciasteczek jest niedostępny podczas renderowania Server Components –
            // odświeżanie sesji realizuje src/proxy.ts.
          }
        },
      },
    },
  );
}
