import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "../db";
import * as schema from "../db/schema";
import { sendPasswordResetEmail } from "./email";
import { supplierSignupSchema } from "./validations/auth";

// Google solo se habilita si están las credenciales (si no, se omite el provider).
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const socialProviders =
  googleClientId && googleClientSecret
    ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
    : undefined;

/** Nombre inicial del comercio para altas sociales (Google), editable luego. */
function deriveSupplierName(user: { name?: string | null; email?: string | null }): string {
  return user.name?.trim() || user.email?.split("@")[0] || "Mi comercio";
}

// Configuración de Better Auth. También la lee su CLI para generar las tablas
// (`npx @better-auth/cli generate`). Email y contraseña + Google.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders,
  emailAndPassword: {
    enabled: true,
    // Al restablecer la contraseña, se cierran las demás sesiones del usuario.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
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
        // Antes de crear el usuario, creamos su `supplier` e inyectamos el supplier_id.
        // Alta por email: usa el nombre del comercio y el WhatsApp del body. Alta con
        // Google (u otro social): deriva el nombre del perfil y deja el WhatsApp vacío
        // (se completa en Configuración). Así el alta crea supplier + user (owner).
        before: async (user, context) => {
          const parsed = supplierSignupSchema.safeParse(context?.body ?? {});
          let supplierValues: { name: string; whatsappPhone: string | null };
          if (parsed.success) {
            supplierValues = {
              name: parsed.data.businessName,
              whatsappPhone: parsed.data.whatsapp,
            };
          } else if (context?.path === "/sign-up/email") {
            // El alta por email siempre debe traer los datos del comercio.
            throw new APIError("BAD_REQUEST", {
              message: "Faltan los datos del comercio para crear la cuenta",
            });
          } else {
            supplierValues = { name: deriveSupplierName(user), whatsappPhone: null };
          }

          const [supplier] = await db
            .insert(schema.suppliers)
            .values(supplierValues)
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
