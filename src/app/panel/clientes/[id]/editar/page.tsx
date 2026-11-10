import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { db } from "@/db";
import { customers } from "@/db/schema";
import { getCurrentTenant } from "@/lib/session";
import { tenantEq } from "@/lib/tenant";
import type { CustomerFormValues } from "@/lib/validations/customer";

import { CustomerForm } from "../../customer-form";

export const metadata: Metadata = {
  title: "Editar cliente",
};

/** Número de la base ("12.50") al formato de entrada argentino ("12,50"). */
function toInput(value: string): string {
  return value.replace(".", ",");
}

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    redirect("/login");
  }

  const { id } = await params;

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), tenantEq(customers, tenant)))
    .limit(1);
  if (!customer) {
    notFound();
  }

  const defaults: CustomerFormValues = {
    businessName: customer.businessName,
    contactName: customer.contactName ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    notes: customer.notes ?? "",
    priceList: customer.priceList,
    discountPct: toInput(customer.discountPct),
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
      <Link href="/panel/clientes" className="text-muted-foreground text-sm hover:underline">
        ← Volver a clientes
      </Link>
      <h1 className="text-2xl font-semibold">Editar cliente</h1>

      <CustomerForm mode="edit" customerId={customer.id} defaults={defaults} />
    </main>
  );
}
