import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { getCurrentTenant } from "@/lib/session";

import { ConfigForm } from "./config-form";

export const metadata: Metadata = {
  title: "Configuración",
};

export default async function ConfiguracionPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    redirect("/login");
  }

  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, tenant.supplierId))
    .limit(1);
  if (!supplier) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
      <Link href="/panel" className="text-muted-foreground text-sm hover:underline">
        ← Volver al panel
      </Link>
      <Card size="default">
        <CardHeader>
          <CardTitle className="text-xl">Configuración</CardTitle>
          <CardDescription>Datos de tu comercio y las funciones que usás.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigForm
            defaults={{
              name: supplier.name,
              whatsapp: supplier.whatsappPhone ?? "",
              useBrands: supplier.useBrands,
              useCategories: supplier.useCategories,
              usesOwnCodes: supplier.usesOwnCodes,
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
