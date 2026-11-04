import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { categories, products, suppliers } from "@/db/schema";
import { getCurrentTenant } from "@/lib/session";
import { tenantEq } from "@/lib/tenant";

import { TaxonomyManager } from "../_components/taxonomy-manager";
import { createCategory, deleteCategory, moveCategory, renameCategory } from "./actions";

export const metadata: Metadata = {
  title: "Categorías",
};

export default async function CategoriasPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    redirect("/login");
  }

  const [supplier] = await db
    .select({ useCategories: suppliers.useCategories })
    .from(suppliers)
    .where(eq(suppliers.id, tenant.supplierId))
    .limit(1);
  if (!supplier) {
    redirect("/login");
  }
  if (!supplier.useCategories) {
    redirect("/panel");
  }

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(tenantEq(categories, tenant))
    .groupBy(categories.id)
    .orderBy(categories.sortOrder, categories.name);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
      <Link href="/panel" className="text-muted-foreground text-sm hover:underline">
        ← Volver al panel
      </Link>
      <Card size="default">
        <CardHeader>
          <CardTitle className="text-xl">Categorías</CardTitle>
          <CardDescription>
            Agrupá tus artículos. Podés ordenarlas; así se muestran en la lista y al cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaxonomyManager
            items={rows}
            labels={{ singular: "categoría", plural: "categorías" }}
            onCreate={createCategory}
            onRename={renameCategory}
            onDelete={deleteCategory}
            onMove={moveCategory}
          />
        </CardContent>
      </Card>
    </main>
  );
}
