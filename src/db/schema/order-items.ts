import { index, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { lineStatus, orderMode, pricingUnit } from "./_enums";
import { id, timestamps } from "./_shared";
import { orders } from "./orders";
import { products } from "./products";

// Sin supplier_id: se accede siempre por su pedido (ver DECISIONES.md).
export const orderItems = pgTable(
  "order_items",
  {
    id,
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    // Copias del artículo al enviar el pedido.
    code: text("code").notNull(),
    name: text("name").notNull(),
    presentation: text("presentation"),
    brandName: text("brand_name"),
    categoryName: text("category_name"),
    pricingUnit: pricingUnit("pricing_unit").notNull(),
    orderMode: orderMode("order_mode").notNull(),
    // Precio con lista y descuento; se congela al enviar.
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
    originalQuantity: numeric("original_quantity", { precision: 10, scale: 3 }).notNull(),
    lineStatus: lineStatus("line_status").notNull().default("ok"),
    replacesProductId: uuid("replaces_product_id").references(() => products.id),
    estimatedWeightKg: numeric("estimated_weight_kg", { precision: 10, scale: 3 }),
    actualWeightKg: numeric("actual_weight_kg", { precision: 10, scale: 3 }),
    estimatedLineTotal: numeric("estimated_line_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    finalLineTotal: numeric("final_line_total", { precision: 12, scale: 2 }),
    ...timestamps,
  },
  (t) => [
    index("order_items_order_id_idx").on(t.orderId),
    index("order_items_product_id_idx").on(t.productId),
  ],
);
