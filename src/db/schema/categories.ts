import { index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { id, timestamps } from "./_shared";
import { suppliers } from "./suppliers";

export const categories = pgTable(
  "categories",
  {
    id,
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    unique("categories_supplier_id_name_unique").on(t.supplierId, t.name),
    index("categories_supplier_id_idx").on(t.supplierId),
  ],
);
