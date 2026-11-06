import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { brands, products, suppliers } from "@/db/schema";
import { getCurrentTenant } from "@/lib/session";
import { tenantEq } from "@/lib/tenant";

import { TaxonomyManager } from "../_components/taxonomy-manager";
import { createBrand, deleteBrand, renameBrand } from "./actions";

export const metadata: Metadata = {
  title: "Marcas",
};

export default async function MarcasPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    redirect("/login");
  }

  const [supplier] = await db
    .select({ useBrands: suppliers.useBrands })
    .from(suppliers)
    .where(eq(suppliers.id, tenant.supplierId))
    .limit(1);
  if (!supplier) {
    redirect("/login");
  }
  if (!supplier.useBrands) {
    redirect("/panel");
  }

  const rows = await db
    .select({
      id: brands.id,
      name: brands.name,
      productCount: count(products.id),
    })
    .from(brands)
    .leftJoin(products, eq(products.brandId, brands.id))
    .where(tenantEq(brands, tenant))
    .groupBy(brands.id)
    .orderBy(brands.name);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
      <Link href="/panel" className="text-muted-foreground text-sm hover:underline">
        ← Volver al panel
      </Link>
      <Card size="default">
        <CardHeader>
          <CardTitle className="text-xl">Marcas</CardTitle>
          <CardDescription>Clasificá tus artículos por marca.</CardDescription>
        </CardHeader>
        <CardContent>
          <TaxonomyManager
            items={rows}
            labels={{ singular: "marca", plural: "marcas" }}
            onCreate={createBrand}
            onRename={renameBrand}
            onDelete={deleteBrand}
          />
        </CardContent>
      </Card>
    </main>
  );
}
