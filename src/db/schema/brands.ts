import { index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { id, timestamps } from "./_shared";
import { suppliers } from "./suppliers";

export const brands = pgTable(
  "brands",
  {
    id,
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [
    unique("brands_supplier_id_name_unique").on(t.supplierId, t.name),
    index("brands_supplier_id_idx").on(t.supplierId),
  ],
);
