import { timestamp, uuid } from "drizzle-orm/pg-core";

// Columnas comunes a todas las tablas. Se esparcen (`...`) dentro de cada tabla.

/** Clave primaria uuid interna e inmutable (gen_random_uuid(), nativo en Neon). */
export const id = uuid("id").primaryKey().defaultRandom();

/** created_at / updated_at en timestamptz. updated_at se refresca a nivel ORM. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
