import { z } from "zod";

import { normalizeWhatsapp } from "./auth";

// Configuración del proveedor: datos del comercio y qué funciones usa.
export const supplierConfigSchema = z.object({
  name: z
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
  useBrands: z.boolean(),
  useCategories: z.boolean(),
  usesOwnCodes: z.boolean(),
});

export type SupplierConfigInput = z.infer<typeof supplierConfigSchema>;
export type SupplierConfigFormValues = z.input<typeof supplierConfigSchema>;
