import { and, asc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { resolveCustomerContext } from "@/lib/customer-access";
import { getDraftQuantities } from "@/lib/order-draft";
import { selectListPriceCents } from "@/lib/order-pricing";

import { LinkInactive } from "./link-inactive";
import { OrderBuilder, type CatalogProduct } from "./order-builder";

type SearchParams = Record<string, string | string[] | undefined>;

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { token } = await params;
  const ctx = await resolveCustomerContext(token);
  if (!ctx) return <LinkInactive />;

  const q = str((await searchParams).q).trim();

  const where = and(
    eq(products.supplierId, ctx.customer.supplierId),
    eq(products.isActive, true),
    q ? or(ilike(products.name, `%${q}%`), ilike(products.code, `%${q}%`)) : undefined,
  );

  const rows = await db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      presentation: products.presentation,
      categoryName: categories.name,
      categorySort: categories.sortOrder,
      orderMode: products.orderMode,
      pricingUnit: products.pricingUnit,
      avgPieceWeightKg: products.avgPieceWeightKg,
      wholesalePrice: products.wholesalePrice,
      retailPrice: products.retailPrice,
      isAvailable: products.isAvailable,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(asc(categories.sortOrder), asc(products.name));

  const catalog: CatalogProduct[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    presentation: r.presentation,
    categoryName: ctx.supplier.useCategories ? r.categoryName : null,
    orderMode: r.orderMode,
    pricingUnit: r.pricingUnit,
    avgPieceWeightKg: r.avgPieceWeightKg === null ? null : Number(r.avgPieceWeightKg),
    isAvailable: r.isAvailable,
    listPriceCents: selectListPriceCents(r, ctx.customer.priceList),
  }));

  const { quantities } = await getDraftQuantities(ctx.customer.id);

  return (
    <OrderBuilder
      token={token}
      businessName={ctx.customer.businessName}
      supplierName={ctx.supplier.name}
      discountPct={Number(ctx.customer.discountPct)}
      products={catalog}
      initialQuantities={quantities}
      query={q}
    />
  );
}
