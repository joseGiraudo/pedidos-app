import { z } from "zod";

// Validación del catálogo. Compartida entre cliente (React Hook Form) y servidor
// (server actions). Toda entrada se valida con Zod (ver CLAUDE.md).

/** Normaliza un nombre: recorta las puntas y colapsa espacios internos. */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
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
