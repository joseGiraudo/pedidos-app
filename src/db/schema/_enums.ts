import { pgEnum } from "drizzle-orm/pg-core";

// Enums de Postgres compartidos por el esquema. Valores en inglés.

export const supplierPlan = pgEnum("supplier_plan", ["free"]);

export const priceList = pgEnum("price_list", ["wholesale", "retail"]);

export const pricingUnit = pgEnum("pricing_unit", ["unit", "kg"]);

export const orderMode = pgEnum("order_mode", ["unit", "piece", "kg"]);

export const priceBatchKind = pgEnum("price_batch_kind", ["increase", "import"]);

export const priceTarget = pgEnum("price_target", ["wholesale", "retail", "both"]);

export const orderStatus = pgEnum("order_status", [
  "draft",
  "sent",
  "changes_requested",
  "accepted",
  "delivered",
  "rejected",
  "cancelled",
]);

export const orderActor = pgEnum("order_actor", ["customer", "supplier"]);

export const paymentMethod = pgEnum("payment_method", ["cash", "transfer", "other"]);

export const paymentStatus = pgEnum("payment_status", ["pending", "paid"]);

export const lineStatus = pgEnum("line_status", ["ok", "out_of_stock", "replaced"]);

export const orderEventType = pgEnum("order_event_type", [
  "created",
  "sent",
  "edited",
  "changes_requested",
  "item_replaced",
  "accepted",
  "weighed",
  "delivered",
  "payment_updated",
  "rejected",
  "cancelled",
]);
