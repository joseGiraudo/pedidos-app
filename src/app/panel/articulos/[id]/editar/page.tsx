import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { db } from "@/db";
import { brands, categories, products, suppliers } from "@/db/schema";
import { getCurrentTenant } from "@/lib/session";
import { tenantEq } from "@/lib/tenant";
import type { ProductFormValues } from "@/lib/validations/catalog";

import { ProductForm } from "../../product-form";

export const metadata: Metadata = {
  title: "Editar artículo",
};

/** Número de la base ("12500.00") al formato de entrada argentino ("12500,00"). */
function toInput(value: string | null): string {
  return value === null ? "" : value.replace(".", ",");
}

export default async function EditarArticuloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    redirect("/login");
  }

  const { id } = await params;

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

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), tenantEq(products, tenant)))
    .limit(1);
  if (!product) {
    notFound();
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

  const defaults: ProductFormValues = {
    code: product.code,
    name: product.name,
    brandId: product.brandId ?? "",
    categoryId: product.categoryId ?? "",
    presentation: product.presentation ?? "",
    unitsPerPack: product.unitsPerPack === null ? "" : String(product.unitsPerPack),
    pricingUnit: product.pricingUnit,
    orderMode: product.orderMode,
    avgPieceWeightKg: toInput(product.avgPieceWeightKg),
    wholesalePrice: toInput(product.wholesalePrice),
    retailPrice: toInput(product.retailPrice),
    isAvailable: product.isAvailable,
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
      <Link href="/panel/articulos" className="text-muted-foreground text-sm hover:underline">
        ← Volver a artículos
      </Link>
      <h1 className="text-2xl font-semibold">Editar artículo</h1>

      <ProductForm
        mode="edit"
        productId={product.id}
        defaults={defaults}
        brands={brandOptions}
        categories={categoryOptions}
        useBrands={supplier.useBrands}
        useCategories={supplier.useCategories}
        usesOwnCodes={supplier.usesOwnCodes}
        generatedCode={supplier.usesOwnCodes ? undefined : product.code}
      />
    </main>
  );
}
