import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { orderActor, orderStatus, paymentMethod, paymentStatus, priceList } from "./_enums";
import { id, timestamps } from "./_shared";
import { customers } from "./customers";
import { suppliers } from "./suppliers";

export const orders = pgTable(
  "orders",
  {
    id,
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    // NULL mientras es borrador; se asigna al enviar (con lock en suppliers.next_order_number).
    number: integer("number"),
    status: orderStatus("status").notNull().default("draft"),
    createdBy: orderActor("created_by").notNull(),
    // Copia de cómo se calculó el pedido.
    priceList: priceList("price_list").notNull(),
    discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    extraDiscountPct: numeric("extra_discount_pct", { precision: 5, scale: 2 }),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    estimatedTotal: numeric("estimated_total", { precision: 12, scale: 2 }).notNull().default("0"),
    finalTotal: numeric("final_total", { precision: 12, scale: 2 }),
    customerNotes: text("customer_notes"),
    supplierNotes: text("supplier_notes"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    expectedDeliveryDate: date("expected_delivery_date"),
    paymentMethod: paymentMethod("payment_method"),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    cancellationReason: text("cancellation_reason"),
    cancelledBy: orderActor("cancelled_by"),
    // Control de ediciones simultáneas.
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    unique("orders_supplier_id_number_unique").on(t.supplierId, t.number),
    index("orders_supplier_id_idx").on(t.supplierId),
    index("orders_customer_id_idx").on(t.customerId),
    index("orders_supplier_id_status_idx").on(t.supplierId, t.status),
  ],
);
