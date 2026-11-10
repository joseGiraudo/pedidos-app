import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentTenant } from "@/lib/session";
import type { CustomerFormValues } from "@/lib/validations/customer";

import { CustomerForm } from "../customer-form";

export const metadata: Metadata = {
  title: "Nuevo cliente",
};

const emptyDefaults: CustomerFormValues = {
  businessName: "",
  contactName: "",
  phone: "",
  address: "",
  city: "",
  notes: "",
  priceList: "wholesale",
  discountPct: "",
};

export default async function NuevoClientePage() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
      <Link href="/panel/clientes" className="text-muted-foreground text-sm hover:underline">
        ← Volver a clientes
      </Link>
      <h1 className="text-2xl font-semibold">Nuevo cliente</h1>

      <CustomerForm mode="create" defaults={emptyDefaults} />
    </main>
  );
}
