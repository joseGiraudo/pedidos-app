import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { orderActor, orderEventType, orderStatus } from "./_enums";
import { id, timestamps } from "./_shared";
import { orders } from "./orders";
import { suppliers } from "./suppliers";

export const orderEvents = pgTable(
  "order_events",
  {
    id,
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    eventType: orderEventType("event_type").notNull(),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status"),
    actor: orderActor("actor").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id),
    note: text("note"),
    changes: jsonb("changes"),
    ...timestamps,
  },
  (t) => [
    index("order_events_order_id_idx").on(t.orderId),
    index("order_events_supplier_id_idx").on(t.supplierId),
  ],
);
