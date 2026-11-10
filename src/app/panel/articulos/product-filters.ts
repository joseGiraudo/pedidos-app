import { and, asc, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";

import { products } from "@/db/schema";
import { tenantEq, type Tenant } from "@/lib/tenant";

// Filtros, orden y WHERE de la lista de artículos. Compartido entre la pantalla
// (/panel/articulos) y la exportación, para que "lista filtrada" signifique lo mismo en ambas.

export type SearchParams = Record<string, string | string[] | undefined>;

export function str(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

/** Columnas por las que se puede ordenar (orden en el servidor). */
export const PRODUCT_SORT_COLUMNS = {
  name: products.name,
  code: products.code,
  wholesale: products.wholesalePrice,
} as const;

export type ProductSortKey = keyof typeof PRODUCT_SORT_COLUMNS;

export type ProductFilters = {
  q: string;
  cat: string;
  brand: string;
  avail: "yes" | "no" | "all";
  status: "active" | "inactive" | "all";
};

/** Lee los filtros de los query params, con los mismos defaults que la lista. */
export function readProductFilters(sp: SearchParams): ProductFilters {
  const availParam = str(sp.avail);
  const statusParam = str(sp.status);
  return {
    q: str(sp.q).trim(),
    cat: str(sp.cat),
    brand: str(sp.brand),
    avail: availParam === "yes" || availParam === "no" ? availParam : "all",
    status: statusParam === "inactive" || statusParam === "all" ? statusParam : "active",
  };
}

/** Clave y dirección de orden desde los query params (default: nombre ascendente). */
export function readProductSort(sp: SearchParams): { key: ProductSortKey; dir: "asc" | "desc" } {
  const sortParam = str(sp.sort);
  const key: ProductSortKey = sortParam in PRODUCT_SORT_COLUMNS ? (sortParam as ProductSortKey) : "name";
  const dir = str(sp.dir) === "desc" ? "desc" : "asc";
  return { key, dir };
}

/** Cláusula ORDER BY (con desempate por nombre). */
export function productOrderBy(sort: { key: ProductSortKey; dir: "asc" | "desc" }): SQL[] {
  const column = PRODUCT_SORT_COLUMNS[sort.key];
  return [sort.dir === "desc" ? desc(column) : asc(column), asc(products.name)];
}

/** WHERE de la lista según el proveedor y los filtros (respeta los flags de marca/categoría). */
export function buildProductWhere(
  tenant: Tenant,
  flags: { useBrands: boolean; useCategories: boolean },
  f: ProductFilters,
): SQL | undefined {
  const conditions: SQL[] = [tenantEq(products, tenant)];

  // Por defecto solo activos; el filtro de estado permite ver los dados de baja.
  if (f.status === "active") conditions.push(eq(products.isActive, true));
  else if (f.status === "inactive") conditions.push(eq(products.isActive, false));

  if (f.q) {
    const search = or(ilike(products.name, `%${f.q}%`), ilike(products.code, `%${f.q}%`));
    if (search) conditions.push(search);
  }
  if (flags.useCategories && f.cat) {
    conditions.push(f.cat === "none" ? isNull(products.categoryId) : eq(products.categoryId, f.cat));
  }
  if (flags.useBrands && f.brand) {
    conditions.push(f.brand === "none" ? isNull(products.brandId) : eq(products.brandId, f.brand));
  }
  if (f.avail === "yes") conditions.push(eq(products.isAvailable, true));
  else if (f.avail === "no") conditions.push(eq(products.isAvailable, false));

  return and(...conditions);
}
