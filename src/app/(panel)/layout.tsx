// Layout panelu – strony wymagające zalogowania. Grupa (panel) nie wpływa na URL.
import { AppNav } from "@/components/layout/app-nav";
import { requireUser } from "@/lib/auth";
import { logout } from "../login/actions";

export default async function PanelLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser(); // niezalogowany -> /login

  return (
    // lg:pl-64 – odstęp na sidebar
    <div className="min-h-dvh lg:pl-64 print:pl-0">
      <AppNav email={user.email} logoutAction={logout} />
      {/* pb-28 – odstęp na dolny pasek zakładek */}
      <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-28 md:px-8 lg:pt-10 lg:pb-12 print:p-0">
        {children}
      </main>
    </div>
  );
}
