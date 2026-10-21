// Główny layout aplikacji – struktura dokumentu, font i metadane.
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Font Poppins (next/font – pliki hostowane razem z aplikacją)
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"], // latin-ext: polskie znaki diakrytyczne
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Invento", template: "%s · Invento" },
  description: "Zarządzanie magazynem, zamówieniami i fakturami dla małych firm.",
  applicationName: "Invento",
};

// Viewport i kolor paska przeglądarki na urządzeniach mobilnych
export const viewport: Viewport = {
  themeColor: "#07070a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
