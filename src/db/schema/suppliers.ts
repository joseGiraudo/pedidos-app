import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

import { supplierPlan } from "./_enums";
import { id, timestamps } from "./_shared";

export const suppliers = pgTable("suppliers", {
  id,
  name: text("name").notNull(),
  // Opcional: el alta con Google crea el proveedor sin WhatsApp; se completa en
  // Configuración. El registro por email sí lo exige.
  whatsappPhone: text("whatsapp_phone"),
  logoUrl: text("logo_url"),
  plan: supplierPlan("plan").notNull().default("free"),
  useBrands: boolean("use_brands").notNull().default(true),
  useCategories: boolean("use_categories").notNull().default(true),
  usesOwnCodes: boolean("uses_own_codes").notNull().default(false),
  nextProductCode: integer("next_product_code").notNull().default(1),
  nextOrderNumber: integer("next_order_number").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
