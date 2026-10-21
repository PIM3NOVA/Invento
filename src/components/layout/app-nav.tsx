"use client";
// Nawigacja aplikacji:
//  - desktop (lg+): stały panel boczny,
//  - mobile: górny pasek z wysuwanym menu oraz dolny pasek zakładek.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Warehouse,
  X,
} from "lucide-react";

// Pozycje menu
const NAV_ITEMS = [
  { href: "/", label: "Pulpit", icon: LayoutDashboard },
  { href: "/produkty", label: "Produkty", icon: Package },
  { href: "/magazyny", label: "Magazyny", icon: Warehouse },
  { href: "/ruchy", label: "Ruchy magazynowe", icon: ArrowLeftRight },
  { href: "/inwentaryzacja", label: "Inwentaryzacja", icon: ClipboardCheck },
  { href: "/zamowienia", label: "Zamówienia", icon: ShoppingCart },
  { href: "/kontrahenci", label: "Kontrahenci", icon: Users },
  { href: "/faktury", label: "Faktury", icon: FileText },
  { href: "/ustawienia", label: "Ustawienia firmy", icon: Settings },
];

// Zakładki dolnego paska w widoku mobilnym (piąta: "Więcej")
const BOTTOM_ITEMS = ["/", "/produkty", "/zamowienia", "/faktury"];

// Aktywność linku: "/" dokładnie, pozostałe również dla podstron
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="size-9" />
      <span className="text-lg font-semibold tracking-tight">
        Invento<span className="text-brand">.</span>
      </span>
    </Link>
  );
}

// Lista linków (sidebar i menu mobilne)
function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
              active
                ? "bg-brand-soft font-medium text-brand"
                : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBox({ email, logoutAction }: { email: string; logoutAction: () => Promise<void> }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="truncate text-xs text-muted">Zalogowano jako</p>
      <p className="truncate text-sm font-medium">{email}</p>
      <form action={logoutAction}>
        <button className="mt-2 flex items-center gap-2 text-sm text-muted hover:text-brand">
          <LogOut className="size-4" /> Wyloguj
        </button>
      </form>
    </div>
  );
}

export function AppNav({
  email,
  logoutAction,
}: {
  email: string;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Blokada przewijania strony przy otwartym menu
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
  }, [drawerOpen]);

  return (
    <>
      {/* Sidebar (desktop) */}
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 flex-col justify-between border-r border-line bg-surface p-4 lg:flex">
        <div className="flex flex-col gap-8">
          <div className="px-2 pt-2">
            <Logo />
          </div>
          <NavLinks pathname={pathname} />
        </div>
        <UserBox email={email} logoutAction={logoutAction} />
      </aside>

      {/* Górny pasek (mobile) */}
      <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
          aria-label="Otwórz menu"
        >
          <Menu className="size-6" />
        </button>
      </header>

      {/* Wysuwane menu (mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* tło – kliknięcie zamyka menu */}
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-[85vw] flex-col justify-between overflow-y-auto rounded-l-card border-l border-line bg-surface p-4">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
                  aria-label="Zamknij menu"
                >
                  <X className="size-6" />
                </button>
              </div>
              <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
            <div className="pt-6">
              <UserBox email={email} logoutAction={logoutAction} />
            </div>
          </div>
        </div>
      )}

      {/* Dolny pasek zakładek (mobile) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV_ITEMS.filter((item) => BOTTOM_ITEMS.includes(item.href)).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] ${
                active ? "text-brand" : "text-muted"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted"
        >
          <Menu className="size-5" />
          Więcej
        </button>
      </nav>
    </>
  );
}
