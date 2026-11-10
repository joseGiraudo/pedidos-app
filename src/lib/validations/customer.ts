import { z } from "zod";

import { normalizeName, parseArgNumber } from "./catalog";
import { normalizeWhatsapp } from "./auth";

// Validación de clientes (kiosqueros). Compartida entre cliente (React Hook Form) y
// servidor (server actions). Toda entrada se valida con Zod (ver CLAUDE.md).
//
// Igual que el catálogo: el esquema valida la forma cruda (todo string) y NO transforma
// tipos; la conversión a valores de base la hace `toCustomerValues`, así el tipo del
// formulario queda simple.

export const PRICE_LISTS = ["wholesale", "retail"] as const;
export type PriceListValue = (typeof PRICE_LISTS)[number];

/**
 * Valores del formulario de cliente: todo llega como string (inputs/selects). La
 * conversión a tipos de base se hace en `toCustomerValues`.
 */
export type CustomerFormValues = {
  businessName: string;
  contactName: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  priceList: PriceListValue;
  discountPct: string;
};

export const customerSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(2, "Ingresá el nombre del negocio")
      .max(120, "Máximo 120 caracteres"),
    contactName: z.string().trim().max(120, "Máximo 120 caracteres"),
    phone: z.string().trim().max(30, "Máximo 30 caracteres"),
    address: z.string().trim().max(200, "Máximo 200 caracteres"),
    city: z.string().trim().max(120, "Máximo 120 caracteres"),
    notes: z.string().trim().max(500, "Máximo 500 caracteres"),
    priceList: z.enum(PRICE_LISTS),
    discountPct: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    // El teléfono es opcional, pero si se carga sirve para el botón de WhatsApp: exigimos
    // un número válido (solo dígitos, con característica), igual que el WhatsApp del proveedor.
    if (v.phone !== "" && !/^\d{10,15}$/.test(normalizeWhatsapp(v.phone))) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Teléfono inválido (solo números, con característica)",
      });
    }

    if (v.discountPct !== "") {
      const pct = parseArgNumber(v.discountPct);
      if (pct === null) {
        ctx.addIssue({ code: "custom", path: ["discountPct"], message: "Descuento inválido" });
      } else if (pct < 0 || pct > 100) {
        ctx.addIssue({ code: "custom", path: ["discountPct"], message: "Debe estar entre 0 y 100" });
      }
    }
  });

export type CustomerInput = z.infer<typeof customerSchema>;

/** Porcentaje a string `numeric(5,2)` para la base. */
function toPct(n: number): string {
  return n.toFixed(2);
}

/**
 * Valores del formulario a columnas de `customers`. Normaliza el nombre, deja los
 * opcionales vacíos en `null`, el teléfono en solo dígitos y el descuento como
 * `numeric(5,2)` (vacío = 0). No toca `access_token` ni `is_active`.
 */
export function toCustomerValues(values: CustomerInput) {
  const pct = parseArgNumber(values.discountPct);
  return {
    businessName: normalizeName(values.businessName),
    contactName: values.contactName === "" ? null : normalizeName(values.contactName),
    phone: values.phone === "" ? null : normalizeWhatsapp(values.phone),
    address: values.address === "" ? null : values.address,
    city: values.city === "" ? null : normalizeName(values.city),
    notes: values.notes === "" ? null : values.notes,
    priceList: values.priceList,
    discountPct: toPct(pct ?? 0),
  };
}
