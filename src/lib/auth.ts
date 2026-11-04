import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "../db";
import * as schema from "../db/schema";
import { supplierSignupSchema } from "./validations/auth";

// Configuración de Better Auth. También la lee su CLI para generar las tablas
// (`npx @better-auth/cli generate`). Por ahora solo email y contraseña; Google y
// la verificación/recuperación por email llegan más adelante en la Etapa 1.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      // Proveedor al que pertenece el usuario. Lo setea el servidor (hook de abajo),
      // nunca el cliente (`input: false`); en la base es uuid con FK a suppliers.
      supplierId: { type: "string", required: false, input: false },
      // Rol dentro del proveedor; tampoco se acepta del cliente.
      role: { type: "string", required: false, input: false, defaultValue: "owner" },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Antes de crear el usuario, creamos su `supplier` con los datos del comercio
        // que viajan en el body del alta e inyectamos el supplier_id. Así el registro
        // crea supplier + user (owner) de forma atómica desde la perspectiva del alta.
        before: async (user, context) => {
          const parsed = supplierSignupSchema.safeParse(context?.body ?? {});
          if (!parsed.success) {
            throw new APIError("BAD_REQUEST", {
              message: "Faltan los datos del comercio para crear la cuenta",
            });
          }
          const [supplier] = await db
            .insert(schema.suppliers)
            .values({
              name: parsed.data.businessName,
              whatsappPhone: parsed.data.whatsapp,
            })
            .returning({ id: schema.suppliers.id });

          return { data: { ...user, supplierId: supplier.id } };
        },
      },
    },
  },
  // Debe ir último: hace que las server actions persistan las cookies de sesión.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
