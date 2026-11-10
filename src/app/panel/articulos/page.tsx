import { count, eq } from "drizzle-orm";
import { cn } from "cn";
import { DownloadIcon, PlusIcon, UploadIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { db } from "@/db";
import { brands, categories, products, suppliers } from "@/db/schema";
import { getCurrentTenant } from "@/lib/session";
import { tenantEq } from "@/lib/tenant";

import { ArticlesTable, type ProductRow } from "./articles-table";
import { ArticlesToolbar } from "./articles-toolbar";
import {
  buildProductWhere,
  productOrderBy,
  readProductFilters,
  readProductSort,
  str,
  type SearchParams,
} from "./product-filters";

export const metadata: Metadata = {
  title: "Artículos",
};

const PAGE_SIZE = 20;

export default async function ArticulosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    redirect("/login");
  }

  const [supplier] = await db
    .select({ useBrands: suppliers.useBrands, useCategories: suppliers.useCategories })
    .from(suppliers)
    .where(eq(suppliers.id, tenant.supplierId))
    .limit(1);
  if (!supplier) {
    redirect("/login");
  }

  const sp = await searchParams;
  const filters = readProductFilters(sp);
  const sort = readProductSort(sp);
  const page = Math.max(1, Number(str(sp.page)) || 1);

  const where = buildProductWhere(tenant, supplier, filters);
  const order = productOrderBy(sort);

  // Query de exportación: mismos filtros/orden que la vista actual (lista completa o filtrada).
  const exportParams = new URLSearchParams();
  if (filters.q) exportParams.set("q", filters.q);
  if (filters.cat) exportParams.set("cat", filters.cat);
  if (filters.brand) exportParams.set("brand", filters.brand);
  if (filters.avail !== "all") exportParams.set("avail", filters.avail);
  if (filters.status !== "active") exportParams.set("status", filters.status);
  if (sort.key !== "name") exportParams.set("sort", sort.key);
  if (sort.dir !== "asc") exportParams.set("dir", sort.dir);
  const exportQs = exportParams.toString();
  const exportHref = (format: string) =>
    `/panel/articulos/export?${exportQs}${exportQs ? "&" : ""}format=${format}`;

  const [{ total }] = await db.select({ total: count() }).from(products).where(where);

  const rows: ProductRow[] = await db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      brandName: brands.name,
      categoryName: categories.name,
      presentation: products.presentation,
      wholesalePrice: products.wholesalePrice,
      retailPrice: products.retailPrice,
      isAvailable: products.isAvailable,
      isActive: products.isActive,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(...order)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const categoryOptions = supplier.useCategories
    ? await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(tenantEq(categories, tenant))
        .orderBy(categories.sortOrder, categories.name)
    : [];
  const brandOptions = supplier.useBrands
    ? await db
        .select({ id: brands.id, name: brands.name })
        .from(brands)
        .where(tenantEq(brands, tenant))
        .orderBy(brands.name)
    : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-8">
      <Link href="/panel" className="text-muted-foreground text-sm hover:underline">
        ← Volver al panel
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Artículos</h1>
          <p className="text-muted-foreground text-sm">
            {total} {total === 1 ? "artículo" : "artículos"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={exportHref("csv")}
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            <DownloadIcon />
            CSV
          </a>
          <a
            href={exportHref("xlsx")}
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            <DownloadIcon />
            Excel
          </a>
          <Link
            href="/panel/articulos/importar"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            <UploadIcon />
            Importar
          </Link>
          <Link href="/panel/articulos/nuevo" className={cn(buttonVariants({ size: "lg" }))}>
            <PlusIcon />
            Agregar artículo
          </Link>
        </div>
      </div>

      <ArticlesToolbar
        defaults={filters}
        categories={categoryOptions}
        brands={brandOptions}
        useBrands={supplier.useBrands}
        useCategories={supplier.useCategories}
      />

      <ArticlesTable
        rows={rows}
        useBrands={supplier.useBrands}
        useCategories={supplier.useCategories}
        sort={sort}
        pagination={{ page, pageSize: PAGE_SIZE, total }}
      />
    </main>
  );
}
