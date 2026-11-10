import type { OrderMode, PricingUnit } from "@/lib/validations/catalog";

// Mapeo de las columnas de la planilla del proveedor a los campos canónicos del sistema.
// La planilla propia no tiene por qué usar nuestros nombres, así que el proveedor indica qué
// columna es cada dato; el sistema auto-detecta por encabezado y recuerda el último mapeo
// (ver docs/requisitos.md → "Importación y exportación" y la planilla de reglas-de-negocio.md).

/** Campos canónicos de un artículo en la planilla. */
export const CANONICAL_FIELDS = [
  "codigo",
  "nombre",
  "marca",
  "categoria",
  "presentacion",
  "tipo_precio",
  "forma_pedido",
  "peso_promedio_kg",
  "precio_mayorista",
  "precio_minorista",
  "disponible",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

/** Etiqueta en castellano para la UI del mapeo. */
export const FIELD_LABELS: Record<CanonicalField, string> = {
  codigo: "Código",
  nombre: "Nombre",
  marca: "Marca",
  categoria: "Categoría",
  presentacion: "Presentación",
  tipo_precio: "Tipo de precio (unidad/kg)",
  forma_pedido: "Forma de pedido",
  peso_promedio_kg: "Peso promedio (kg)",
  precio_mayorista: "Precio mayorista",
  precio_minorista: "Precio minorista",
  disponible: "Disponible",
};

/**
 * Correspondencia campo canónico → encabezado elegido de la planilla (o `null` si no se
 * mapeó). Es lo que se guarda en `suppliers.import_column_mapping` para recordarlo.
 */
export type ColumnMapping = Record<CanonicalField, string | null>;

/** Mapeo vacío (todos los campos sin asignar). */
export function emptyMapping(): ColumnMapping {
  return Object.fromEntries(CANONICAL_FIELDS.map((f) => [f, null])) as ColumnMapping;
}

/** Valida que el mapeo tenga lo mínimo (nombre y precio mayorista; código si se usan propios). */
export function validateMapping(mapping: ColumnMapping, usesOwnCodes: boolean): string | null {
  if (!mapping.nombre) return "Falta asignar la columna de Nombre.";
  if (!mapping.precio_mayorista) return "Falta asignar la columna de Precio mayorista.";
  if (usesOwnCodes && !mapping.codigo) return "Usás códigos propios: asigná la columna de Código.";
  return null;
}

/**
 * Normaliza un encabezado para comparar: sin acentos, en minúsculas, con `.`/`_` y espacios
 * colapsados. Así "P. Lista" y "p_lista" caen en la misma forma ("p lista").
 */
export function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Sinónimos por campo, ya normalizados (comparar contra `normalizeHeader`). El orden de los
// campos define la prioridad al auto-detectar (un encabezado se asigna a un solo campo).
const SYNONYMS: Record<CanonicalField, string[]> = {
  codigo: ["codigo", "cod", "code", "sku"],
  nombre: ["nombre", "descripcion", "detalle", "producto", "articulo", "name", "description"],
  marca: ["marca", "brand"],
  categoria: ["categoria", "rubro", "grupo", "category"],
  presentacion: ["presentacion", "presentation", "envase", "formato"],
  tipo_precio: ["tipo precio", "tipo de precio", "tipo precio venta", "unidad de precio", "pricing"],
  forma_pedido: ["forma pedido", "forma de pedido", "modo pedido", "order mode"],
  peso_promedio_kg: ["peso promedio kg", "peso promedio", "peso prom", "peso", "weight"],
  precio_mayorista: [
    "precio mayorista",
    "precio de lista",
    "precio lista",
    "p lista",
    "mayorista",
    "costo",
    "precio",
    "wholesale",
  ],
  precio_minorista: [
    "precio minorista",
    "precio al publico",
    "precio publico",
    "minorista",
    "pvp",
    "retail",
  ],
  disponible: ["disponible", "disponibilidad", "stock", "en stock", "available", "activo"],
};

/**
 * Auto-detecta el mapeo a partir de los encabezados de la planilla, por nombre (tolerante a
 * acentos, mayúsculas y separadores). Cada encabezado se asigna a un solo campo; lo que no
 * se reconoce queda en `null` para que el proveedor lo complete a mano.
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping = emptyMapping();
  const used = new Set<number>();
  const normalized = headers.map(normalizeHeader);

  for (const field of CANONICAL_FIELDS) {
    const synonyms = SYNONYMS[field];
    const idx = normalized.findIndex((h, i) => !used.has(i) && h !== "" && synonyms.includes(h));
    if (idx !== -1) {
      mapping[field] = headers[idx];
      used.add(idx);
    }
  }

  return mapping;
}

/**
 * Deja solo los campos del mapeo cuyo encabezado todavía existe en la planilla actual. Así un
 * mapeo guardado de otra planilla no apunta a columnas inexistentes.
 */
export function reconcileMapping(saved: ColumnMapping, headers: string[]): ColumnMapping {
  const present = new Set(headers);
  const result = emptyMapping();
  for (const field of CANONICAL_FIELDS) {
    const header = saved[field];
    if (header && present.has(header)) result[field] = header;
  }
  return result;
}

// --- Parsers de celda (valores de la planilla a tipos del sistema) ---

/** `unidad`/`kg` (tolerante) a `PricingUnit`; `null` si está vacío o no se reconoce. */
export function parsePricingUnit(raw: string): PricingUnit | null {
  const v = normalizeHeader(raw);
  if (v === "") return null;
  if (["unidad", "unit", "u", "un"].includes(v)) return "unit";
  if (["kg", "kilo", "kilos", "peso", "por kilo"].includes(v)) return "kg";
  return null;
}

/** `unidad`/`pieza`/`kg` (tolerante) a `OrderMode`; `null` si está vacío o no se reconoce. */
export function parseOrderMode(raw: string): OrderMode | null {
  const v = normalizeHeader(raw);
  if (v === "") return null;
  if (["unidad", "unit", "u", "un"].includes(v)) return "unit";
  if (["pieza", "piece", "horma", "pza"].includes(v)) return "piece";
  if (["kg", "kilo", "kilos", "peso"].includes(v)) return "kg";
  return null;
}

/** `si`/`no` (tolerante) a booleano; `null` si está vacío o no se reconoce. */
export function parseAvailable(raw: string): boolean | null {
  const v = normalizeHeader(raw);
  if (v === "") return null;
  if (["si", "s", "yes", "y", "true", "1", "disponible", "en stock"].includes(v)) return true;
  if (["no", "n", "false", "0", "sin stock", "agotado"].includes(v)) return false;
  return null;
}
