import { sql } from "drizzle-orm";
import { boolean, index, integer, numeric, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { orderMode, pricingUnit } from "./_enums";
import { id, timestamps } from "./_shared";
import { brands } from "./brands";
import { categories } from "./categories";
import { suppliers } from "./suppliers";

export const products = pgTable(
  "products",
  {
    id,
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    // Código visible, único por proveedor y normalizado (trim + mayúsculas en la app).
    code: text("code").notNull(),
    codeIsGenerated: boolean("code_is_generated").notNull().default(false),
    name: text("name").notNull(),
    // NULL = sin marca / sin categoría; no se crean registros falsos.
    brandId: uuid("brand_id").references(() => brands.id),
    categoryId: uuid("category_id").references(() => categories.id),
    presentation: text("presentation"),
    unitsPerPack: integer("units_per_pack"),
    pricingUnit: pricingUnit("pricing_unit").notNull().default("unit"),
    orderMode: orderMode("order_mode").notNull().default("unit"),
    avgPieceWeightKg: numeric("avg_piece_weight_kg", { precision: 8, scale: 3 }),
    wholesalePrice: numeric("wholesale_price", { precision: 12, scale: 2 }).notNull(),
    retailPrice: numeric("retail_price", { precision: 12, scale: 2 }),
    isAvailable: boolean("is_available").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    imageUrl: text("image_url"),
    ...timestamps,
  },
  (t) => [
    unique("products_supplier_id_code_unique").on(t.supplierId, t.code),
    index("products_supplier_id_idx").on(t.supplierId),
    // Búsqueda por nombre con pg_trgm (ver CREATE EXTENSION en la migración).
    index("products_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
  ],
);
