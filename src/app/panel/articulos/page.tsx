import { and, asc, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { cn } from "cn";
import { PlusIcon, UploadIcon } from "lucide-react";
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

export const metadata: Metadata = {
  title: "Artículos",
};

const PAGE_SIZE = 20;

// Columnas por las que se puede ordenar desde los encabezados (orden en el servidor).
const sortableColumns = {
  name: products.name,
  code: products.code,
  wholesale: products.wholesalePrice,
} as const;
type SortKey = keyof typeof sortableColumns;

type SearchParams = Record<string, string | string[] | undefined>;

function str(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

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
  const q = str(sp.q).trim();
  const cat = str(sp.cat);
  const brand = str(sp.brand);
  const availParam = str(sp.avail);
  const avail = availParam === "yes" || availParam === "no" ? availParam : "all";
  const statusParam = str(sp.status);
  const status = statusParam === "inactive" || statusParam === "all" ? statusParam : "active";
  const page = Math.max(1, Number(str(sp.page)) || 1);

  const sortParam = str(sp.sort);
  const sortKey: SortKey = sortParam in sortableColumns ? (sortParam as SortKey) : "name";
  const dir = str(sp.dir) === "desc" ? "desc" : "asc";

  // Por defecto solo activos; el filtro de estado permite ver los dados de baja.
  const conditions = [tenantEq(products, tenant)];
  if (status === "active") conditions.push(eq(products.isActive, true));
  else if (status === "inactive") conditions.push(eq(products.isActive, false));
  if (q) {
    const search = or(ilike(products.name, `%${q}%`), ilike(products.code, `%${q}%`));
    if (search) conditions.push(search);
  }
  if (supplier.useCategories && cat) {
    conditions.push(cat === "none" ? isNull(products.categoryId) : eq(products.categoryId, cat));
  }
  if (supplier.useBrands && brand) {
    conditions.push(brand === "none" ? isNull(products.brandId) : eq(products.brandId, brand));
  }
  if (avail === "yes") conditions.push(eq(products.isAvailable, true));
  else if (avail === "no") conditions.push(eq(products.isAvailable, false));
  const where = and(...conditions);

  const orderColumn = sortableColumns[sortKey];
  const order = dir === "desc" ? desc(orderColumn) : asc(orderColumn);

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
    .orderBy(order, asc(products.name))
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
        defaults={{ q, cat, brand, avail, status }}
        categories={categoryOptions}
        brands={brandOptions}
        useBrands={supplier.useBrands}
        useCategories={supplier.useCategories}
      />

      <ArticlesTable
        rows={rows}
        useBrands={supplier.useBrands}
        useCategories={supplier.useCategories}
        sort={{ key: sortKey, dir }}
        pagination={{ page, pageSize: PAGE_SIZE, total }}
      />
    </main>
  );
}
