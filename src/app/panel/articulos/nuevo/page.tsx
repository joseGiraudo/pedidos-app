import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { brands, categories, suppliers } from "@/db/schema";
import { getCurrentTenant } from "@/lib/session";
import { tenantEq } from "@/lib/tenant";
import type { ProductFormValues } from "@/lib/validations/catalog";

import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "Nuevo artículo",
};

const emptyDefaults: ProductFormValues = {
  code: "",
  name: "",
  brandId: "",
  categoryId: "",
  presentation: "",
  unitsPerPack: "",
  pricingUnit: "unit",
  orderMode: "unit",
  avgPieceWeightKg: "",
  wholesalePrice: "",
  retailPrice: "",
  isAvailable: true,
};

export default async function NuevoArticuloPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    redirect("/login");
  }

  const [supplier] = await db
    .select({
      useBrands: suppliers.useBrands,
      useCategories: suppliers.useCategories,
      usesOwnCodes: suppliers.usesOwnCodes,
    })
    .from(suppliers)
    .where(eq(suppliers.id, tenant.supplierId))
    .limit(1);
  if (!supplier) {
    redirect("/login");
  }

  const brandOptions = supplier.useBrands
    ? await db
        .select({ id: brands.id, name: brands.name })
        .from(brands)
        .where(tenantEq(brands, tenant))
        .orderBy(brands.name)
    : [];
  const categoryOptions = supplier.useCategories
    ? await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(tenantEq(categories, tenant))
        .orderBy(categories.sortOrder, categories.name)
    : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
      <Link href="/panel/articulos" className="text-muted-foreground text-sm hover:underline">
        ← Volver a artículos
      </Link>
      <h1 className="text-2xl font-semibold">Nuevo artículo</h1>

      <ProductForm
        mode="create"
        defaults={emptyDefaults}
        brands={brandOptions}
        categories={categoryOptions}
        useBrands={supplier.useBrands}
        useCategories={supplier.useCategories}
        usesOwnCodes={supplier.usesOwnCodes}
      />
    </main>
  );
}
