// Dodawanie kontrahenta (/kontrahenci/nowy)
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "Nowy kontrahent" };

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nowy kontrahent" />
      <CustomerForm />
    </div>
  );
}
