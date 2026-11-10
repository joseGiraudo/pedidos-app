import { boolean, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { priceList } from "./_enums";
import { id, timestamps } from "./_shared";
import { suppliers } from "./suppliers";

export const customers = pgTable(
  "customers",
  {
    id,
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    businessName: text("business_name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    notes: text("notes"),
    priceList: priceList("price_list").notNull().default("wholesale"),
    discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    // Token aleatorio de 32+ caracteres; único global.
    accessToken: text("access_token").notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("customers_supplier_id_idx").on(t.supplierId)],
);
