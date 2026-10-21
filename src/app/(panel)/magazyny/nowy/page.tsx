// Dodawanie magazynu (/magazyny/nowy)
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { WarehouseForm } from "../warehouse-form";

export const metadata: Metadata = { title: "Nowy magazyn" };

export default function NewWarehousePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nowy magazyn" />
      <WarehouseForm />
    </div>
  );
}
