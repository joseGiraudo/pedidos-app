import { z } from "zod";

import { parseArgNumber } from "./catalog";

// Validación de precios (edición individual y aumentos masivos). Compartida entre cliente
// y servidor. Los montos llegan en formato argentino (coma decimal); se parsean con
// `parseArgNumber` (reusado de catalog.ts) y se operan en centavos en `src/lib/pricing.ts`.

export const PRICE_FIELDS = ["wholesale", "retail"] as const;
export type PriceField = (typeof PRICE_FIELDS)[number];

/**
 * Valida un precio en formato argentino. `required` exige un valor; si no, el vacío es
 * válido (en el minorista significa "usa el mayorista" → NULL).
 */
export function priceStringSchema(required: boolean) {
  return z.string().trim().superRefine((val, ctx) => {
    if (val === "") {
      if (required) ctx.addIssue({ code: "custom", message: "Ingresá el precio" });
      return;
    }
    const n = parseArgNumber(val);
    if (n === null) ctx.addIssue({ code: "custom", message: "Precio inválido" });
    else if (n < 0) ctx.addIssue({ code: "custom", message: "No puede ser negativo" });
  });
}

/** Edición inline de un precio: qué campo y el valor crudo (string del input). */
export const inlinePriceSchema = z.object({
  field: z.enum(PRICE_FIELDS),
  value: z.string(),
});
