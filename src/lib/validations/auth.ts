import { z } from "zod";

// Esquemas de validación de autenticación. Se usan tanto en el cliente (React Hook
// Form) como en el servidor (server action y hook de Better Auth). Toda entrada se
// valida con Zod (ver CLAUDE.md).

/** Deja solo dígitos: quita `+`, espacios, guiones y paréntesis. */
export function normalizeWhatsapp(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Datos del comercio que viajan en el alta y crean el `supplier`. */
export const supplierSignupSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Ingresá el nombre del comercio")
    .max(120, "Máximo 120 caracteres"),
  whatsapp: z
    .string()
    .trim()
    .min(1, "Ingresá tu WhatsApp")
    .transform(normalizeWhatsapp)
    .refine((v) => /^\d{10,15}$/.test(v), "WhatsApp inválido (solo números, con característica)"),
});

/** Formulario completo de registro del proveedor. */
export const registerSchema = supplierSignupSchema.extend({
  name: z.string().trim().min(2, "Ingresá tu nombre").max(120, "Máximo 120 caracteres"),
  email: z.string().trim().toLowerCase().pipe(z.email("Email inválido")),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128, "Máximo 128 caracteres"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterFormValues = z.input<typeof registerSchema>;

/** Inicio de sesión del proveedor. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email inválido")),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginFormValues = z.input<typeof loginSchema>;

/** Pedido de recuperación de contraseña (solo el email). */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email inválido")),
});

export type ForgotPasswordFormValues = z.input<typeof forgotPasswordSchema>;

/** Elección de la nueva contraseña. */
export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres").max(128, "Máximo 128 caracteres"),
    confirmPassword: z.string().min(1, "Repetí la contraseña"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.input<typeof resetPasswordSchema>;
