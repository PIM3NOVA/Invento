"use client";
// Wydruk faktury / zapis do PDF (okno drukowania przeglądarki).
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer className="size-4" /> Drukuj / PDF
    </Button>
  );
}
