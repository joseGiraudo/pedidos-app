import { z } from "zod";

// Validación del catálogo. Compartida entre cliente (React Hook Form) y servidor
// (server actions). Toda entrada se valida con Zod (ver CLAUDE.md).

/** Normaliza un nombre: recorta las puntas y colapsa espacios internos. */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Normaliza un código de artículo: recorta, colapsa espacios y pasa a mayúsculas.
 * El código es único por proveedor (`unique(supplier_id, code)` en la base).
 */
export function normalizeCode(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Código generado por el sistema cuando el proveedor no usa códigos propios.
 * Corto y legible, con relleno de ceros; `next_product_code` del proveedor da el número.
 */
export function generateProductCode(n: number): string {
  return String(n).padStart(4, "0");
}

/**
 * Parsea un número en formato argentino (miles con punto, decimales con coma).
 * Devuelve `null` si está vacío o no es un número válido. No redondea.
 */
export function parseArgNumber(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Monto a string `numeric(…,2)` para la base (dinero nunca como float). */
function toMoney(n: number): string {
  return n.toFixed(2);
}

/** Peso a string `numeric(…,3)` para la base. */
function toWeight(n: number): string {
  return n.toFixed(3);
}

/**
 * Nombre de categoría o marca. Misma forma para ambas: el `unique(supplier_id, name)`
 * de la base evita duplicados por proveedor (ver manejo en las server actions).
 */
export const taxonomyNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ingresá un nombre")
    .max(60, "Máximo 60 caracteres")
    .transform(normalizeName),
});

export type TaxonomyNameInput = z.infer<typeof taxonomyNameSchema>;
export type TaxonomyNameFormValues = z.input<typeof taxonomyNameSchema>;

// ---------------------------------------------------------------------------
// Artículos (alta y edición)
// ---------------------------------------------------------------------------

export const PRICING_UNITS = ["unit", "kg"] as const;
export type PricingUnit = (typeof PRICING_UNITS)[number];

export const ORDER_MODES = ["unit", "piece", "kg"] as const;
export type OrderMode = (typeof ORDER_MODES)[number];

/**
 * Valores del formulario de artículo: todo llega como string (inputs/selects) salvo
 * el disponible. La conversión a tipos de base se hace en `toProductValues`.
 */
export type ProductFormValues = {
  code: string;
  name: string;
  brandId: string;
  categoryId: string;
  presentation: string;
  unitsPerPack: string;
  pricingUnit: PricingUnit;
  orderMode: OrderMode;
  avgPieceWeightKg: string;
  wholesalePrice: string;
  retailPrice: string;
  isAvailable: boolean;
};

/**
 * Esquema de validación del artículo. Fábrica porque el código solo es obligatorio
 * cuando el proveedor usa códigos propios (si no, lo genera el sistema y el campo se
 * oculta). No transforma los tipos: valida la forma cruda; la conversión a valores de
 * base la hace `toProductValues`, así el tipo del formulario queda simple.
 */
export function makeProductSchema(requireCode: boolean) {
  return z
    .object({
      code: z.string().trim().max(40, "Máximo 40 caracteres"),
      name: z.string().trim().min(1, "Ingresá un nombre").max(120, "Máximo 120 caracteres"),
      brandId: z.string(),
      categoryId: z.string(),
      presentation: z.string().trim().max(60, "Máximo 60 caracteres"),
      unitsPerPack: z.string().trim(),
      pricingUnit: z.enum(PRICING_UNITS),
      orderMode: z.enum(ORDER_MODES),
      avgPieceWeightKg: z.string().trim(),
      wholesalePrice: z.string().trim().min(1, "Ingresá el precio mayorista"),
      retailPrice: z.string().trim(),
      isAvailable: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (requireCode && v.code.trim() === "") {
        ctx.addIssue({ code: "custom", path: ["code"], message: "Ingresá un código" });
      }

      const wholesale = parseArgNumber(v.wholesalePrice);
      if (v.wholesalePrice !== "" && wholesale === null) {
        ctx.addIssue({ code: "custom", path: ["wholesalePrice"], message: "Precio inválido" });
      } else if (wholesale !== null && wholesale < 0) {
        ctx.addIssue({ code: "custom", path: ["wholesalePrice"], message: "No puede ser negativo" });
      }

      if (v.retailPrice !== "") {
        const retail = parseArgNumber(v.retailPrice);
        if (retail === null) {
          ctx.addIssue({ code: "custom", path: ["retailPrice"], message: "Precio inválido" });
        } else if (retail < 0) {
          ctx.addIssue({ code: "custom", path: ["retailPrice"], message: "No puede ser negativo" });
        }
      }

      if (v.unitsPerPack !== "") {
        const n = Number(v.unitsPerPack);
        if (!Number.isInteger(n) || n < 1) {
          ctx.addIssue({
            code: "custom",
            path: ["unitsPerPack"],
            message: "Debe ser un número entero mayor a 0",
          });
        }
      }

      // Coherencia precio/pedido:
      // - por unidad ⇒ se pide por unidad; no hay peso promedio.
      // - por kilo ⇒ se pide por pieza o por kilo; por pieza requiere peso promedio.
      if (v.pricingUnit === "unit") {
        if (v.orderMode !== "unit") {
          ctx.addIssue({
            code: "custom",
            path: ["orderMode"],
            message: "Si el precio es por unidad, el pedido es por unidad",
          });
        }
      } else {
        if (v.orderMode === "unit") {
          ctx.addIssue({
            code: "custom",
            path: ["orderMode"],
            message: "Elegí cómo se pide: por pieza o por kilo",
          });
        }
        if (v.orderMode === "piece") {
          const w = parseArgNumber(v.avgPieceWeightKg);
          if (v.avgPieceWeightKg === "" || w === null || w <= 0) {
            ctx.addIssue({
              code: "custom",
              path: ["avgPieceWeightKg"],
              message: "Ingresá el peso promedio de la pieza (kg)",
            });
          }
        }
      }
    });
}

export type ProductDbValues = {
  name: string;
  brandId: string | null;
  categoryId: string | null;
  presentation: string | null;
  unitsPerPack: number | null;
  pricingUnit: PricingUnit;
  orderMode: OrderMode;
  avgPieceWeightKg: string | null;
  wholesalePrice: string;
  retailPrice: string | null;
  isAvailable: boolean;
};

/**
 * Convierte valores ya validados del formulario a los valores de base (normalizados,
 * dinero/peso como string numeric, opcionales en `null`). El `code`, `supplier_id` y
 * `code_is_generated` los resuelve la server action (según use códigos propios o no).
 */
export function toProductValues(v: ProductFormValues): ProductDbValues {
  const byWeight = v.pricingUnit === "kg";
  const byPiece = byWeight && v.orderMode === "piece";
  const avg = byPiece ? parseArgNumber(v.avgPieceWeightKg) : null;

  return {
    name: normalizeName(v.name),
    brandId: v.brandId === "" ? null : v.brandId,
    categoryId: v.categoryId === "" ? null : v.categoryId,
    presentation: v.presentation.trim() === "" ? null : v.presentation.trim(),
    unitsPerPack: v.unitsPerPack.trim() === "" ? null : Number(v.unitsPerPack),
    pricingUnit: v.pricingUnit,
    // Por unidad siempre se pide por unidad, pase lo que pase el formulario.
    orderMode: byWeight ? v.orderMode : "unit",
    avgPieceWeightKg: avg === null ? null : toWeight(avg),
    wholesalePrice: toMoney(parseArgNumber(v.wholesalePrice) ?? 0),
    retailPrice: v.retailPrice.trim() === "" ? null : toMoney(parseArgNumber(v.retailPrice) ?? 0),
    isAvailable: v.isAvailable,
  };
}
