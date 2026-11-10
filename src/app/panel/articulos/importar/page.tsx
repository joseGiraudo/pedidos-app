import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { getCurrentTenant } from "@/lib/session";

import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = {
  title: "Importar artículos",
};

export default async function ImportarPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/login");

  const [supplier] = await db
    .select({
      usesOwnCodes: suppliers.usesOwnCodes,
      useBrands: suppliers.useBrands,
      useCategories: suppliers.useCategories,
    })
    .from(suppliers)
    .where(eq(suppliers.id, tenant.supplierId))
    .limit(1);
  if (!supplier) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-8">
      <Link href="/panel/articulos" className="text-muted-foreground text-sm hover:underline">
        ← Volver a artículos
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Importar artículos</h1>
        <p className="text-muted-foreground text-sm">
          Subí tu planilla (CSV o Excel). El sistema cruza por código y te muestra qué se crea y
          qué se actualiza antes de confirmar.
        </p>
      </div>

      <ImportWizard
        usesOwnCodes={supplier.usesOwnCodes}
        useBrands={supplier.useBrands}
        useCategories={supplier.useCategories}
      />
    </main>
  );
}
