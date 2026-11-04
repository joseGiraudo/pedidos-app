import { index, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { priceBatchKind, priceTarget } from "./_enums";
import { id, timestamps } from "./_shared";
import { suppliers } from "./suppliers";

export const priceUpdateBatches = pgTable(
  "price_update_batches",
  {
    id,
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    kind: priceBatchKind("kind").notNull(),
    description: text("description").notNull(),
    percentage: numeric("percentage", { precision: 6, scale: 2 }),
    rounding: integer("rounding"),
    target: priceTarget("target").notNull(),
    affectedCount: integer("affected_count").notNull().default(0),
    // user.id (Better Auth, texto). Sin FK hasta la Etapa 1.
    createdBy: text("created_by").notNull(),
    revertedAt: timestamp("reverted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("price_update_batches_supplier_id_idx").on(t.supplierId)],
);
