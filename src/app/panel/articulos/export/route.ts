import { eq } from "drizzle-orm";

import { db } from "@/db";
import { brands, categories, products, suppliers } from "@/db/schema";
import { buildCsv, buildXlsx, type ExportProduct } from "@/lib/import/export";
import { getCurrentTenant } from "@/lib/session";

import {
  buildProductWhere,
  productOrderBy,
  readProductFilters,
  readProductSort,
} from "../product-filters";

// Exportación de la lista de artículos (completa o filtrada) a CSV o Excel. Reutiliza los filtros
// de la pantalla para que "lista filtrada" signifique lo mismo. `?template=1` baja la plantilla vacía.

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: Request): Promise<Response> {
  const tenant = await getCurrentTenant();
  if (!tenant) return new Response("No autorizado", { status: 401 });

  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const format = sp.format === "xlsx" ? "xlsx" : "csv";
  const isTemplate = sp.template === "1";

  const [supplier] = await db
    .select({ useBrands: suppliers.useBrands, useCategories: suppliers.useCategories })
    .from(suppliers)
    .where(eq(suppliers.id, tenant.supplierId))
    .limit(1);
  if (!supplier) return new Response("No autorizado", { status: 401 });

  let rows: ExportProduct[] = [];
  if (!isTemplate) {
    const where = buildProductWhere(tenant, supplier, readProductFilters(sp));
    const order = productOrderBy(readProductSort(sp));
    rows = await db
      .select({
        code: products.code,
        name: products.name,
        brandName: brands.name,
        categoryName: categories.name,
        presentation: products.presentation,
        pricingUnit: products.pricingUnit,
        orderMode: products.orderMode,
        avgPieceWeightKg: products.avgPieceWeightKg,
        wholesalePrice: products.wholesalePrice,
        retailPrice: products.retailPrice,
        isAvailable: products.isAvailable,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(...order);
  }

  const base = isTemplate ? "plantilla-articulos" : "articulos";

  if (format === "xlsx") {
    const blob = new Blob([buildXlsx(rows)], { type: XLSX_TYPE });
    return new Response(blob, {
      headers: {
        "Content-Type": XLSX_TYPE,
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      },
    });
  }

  return new Response(buildCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.csv"`,
    },
  });
}
