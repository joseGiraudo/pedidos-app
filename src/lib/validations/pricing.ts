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

// ---------------------------------------------------------------------------
// Aumento / rebaja masivo
// ---------------------------------------------------------------------------

export const PRICE_TARGETS = ["wholesale", "retail", "both"] as const;
export type PriceTargetInput = (typeof PRICE_TARGETS)[number];

export const ROUNDING_MODES = ["up", "nearest"] as const;
export type RoundingModeInput = (typeof ROUNDING_MODES)[number];

/** Múltiplos de redondeo en pesos; 0 = sin redondeo. */
export const PRICE_MULTIPLES = [0, 10, 50, 100] as const;

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

/**
 * Aumento (o rebaja, con porcentaje negativo) aplicado a los artículos seleccionados.
 * `percentage` acotado a [-100, 1000] para no generar precios negativos ni desbordar
 * `numeric(6,2)`. El cálculo real lo hace `src/lib/pricing.ts` en el servidor.
 */
export const priceIncreaseSchema = z.object({
  ids: z.array(uuid).min(1, "Elegí al menos un artículo"),
  percentage: z.number().finite().min(-100).max(1000),
  multiple: z.union([z.literal(0), z.literal(10), z.literal(50), z.literal(100)]),
  mode: z.enum(ROUNDING_MODES),
  target: z.enum(PRICE_TARGETS),
  description: z.string().trim().min(1, "Ingresá una descripción").max(200),
});

export type PriceIncreaseInput = z.infer<typeof priceIncreaseSchema>;
