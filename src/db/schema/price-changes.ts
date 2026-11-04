import { index, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { id, timestamps } from "./_shared";
import { priceUpdateBatches } from "./price-update-batches";
import { products } from "./products";

// Sin supplier_id: se accede siempre por su producto (ver DECISIONES.md).
export const priceChanges = pgTable(
  "price_changes",
  {
    id,
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    // NULL si fue una edición individual (no vino de un batch).
    batchId: uuid("batch_id").references(() => priceUpdateBatches.id),
    oldWholesale: numeric("old_wholesale", { precision: 12, scale: 2 }),
    newWholesale: numeric("new_wholesale", { precision: 12, scale: 2 }),
    oldRetail: numeric("old_retail", { precision: 12, scale: 2 }),
    newRetail: numeric("new_retail", { precision: 12, scale: 2 }),
    // user.id (Better Auth, texto). Sin FK hasta la Etapa 1.
    createdBy: text("created_by").notNull(),
    ...timestamps,
  },
  (t) => [
    index("price_changes_product_id_idx").on(t.productId),
    index("price_changes_batch_id_idx").on(t.batchId),
  ],
);
