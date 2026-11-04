import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db";
import * as schema from "../db/schema";

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
      // Proveedor al que pertenece el usuario. Better Auth lo maneja como string;
      // en la base es uuid con FK a suppliers (ajustado a mano en db/schema/auth.ts).
      // `input: false`: no se acepta del cliente, lo inyecta el registro (tarea futura).
      supplierId: { type: "string", required: true, input: false },
      role: { type: "string", required: true, defaultValue: "owner" },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
