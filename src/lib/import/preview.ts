import { normalizeCode, normalizeName, parseArgNumber } from "@/lib/validations/catalog";
import type { OrderMode, PricingUnit } from "@/lib/validations/catalog";

import {
  parseAvailable,
  parseOrderMode,
  parsePricingUnit,
  type ColumnMapping,
} from "./mapping";

// Vista previa de una importación: clasifica cada fila de la planilla en crear / actualizar /
// posible duplicado / error / omitir, cruzando por código o por nombre+presentación. Lógica
// pura (sin DB ni React) para poder testearla y para que la use tanto la vista previa como el
// aplicar (el servidor nunca confía en lo que mande el cliente: re-corre esto al aplicar).
// Reglas: docs/requisitos.md → "Importación y exportación".

/** Modo de importación (ver requisitos.md). `upsert` = agregar y actualizar (default). */
export type ImportMode = "upsert" | "add_only" | "update_prices_only";

/** Estado de una fila en la vista previa. */
export type RowStatus = "create" | "update" | "possible_duplicate" | "skip" | "error";

/** Producto existente del proveedor, para cruzar. `code` llega ya normalizado de la base. */
export type ExistingProduct = {
  id: string;
  code: string;
  name: string;
  presentation: string | null;
  codeIsGenerated: boolean;
};

/** Valores de una fila ya interpretados. `null` = celda vacía (no cambia nada al actualizar). */
export type ParsedRow = {
  code: string;
  name: string;
  brand: string | null;
  category: string | null;
  presentation: string | null;
  pricingUnit: PricingUnit | null;
  orderMode: OrderMode | null;
  avgPieceWeightKg: number | null;
  wholesale: number | null;
  retail: number | null;
  available: boolean | null;
  parseErrors: string[];
};

/** Fila clasificada. `parsed` lo consume el aplicar; el cliente solo ve lo liviano. */
export type PreviewRow = {
  index: number;
  status: RowStatus;
  code: string;
  name: string;
  matchId: string | null;
  errors: string[];
  skipReason: string | null;
  parsed: ParsedRow;
};

export type PreviewSummary = {
  create: number;
  update: number;
  possibleDuplicate: number;
  skip: number;
  error: number;
};

export type Preview = { rows: PreviewRow[]; summary: PreviewSummary };

export type PreviewInput = {
  headers: string[];
  rows: string[][];
  mapping: ColumnMapping;
  mode: ImportMode;
  existing: ExistingProduct[];
  usesOwnCodes: boolean;
};

/** Clave tolerante para cruzar por nombre + presentación (sin mayúsculas ni espacios de más). */
function namePresKey(name: string, presentation: string | null): string {
  return `${normalizeName(name).toLowerCase()}|${normalizeName(presentation ?? "").toLowerCase()}`;
}

/** Celda de un campo según el mapeo, o "" si el campo no está mapeado o no hay columna. */
function cellOf(
  field: keyof ColumnMapping,
  mapping: ColumnMapping,
  headerIndex: Map<string, number>,
  row: string[],
): string {
  const header = mapping[field];
  if (!header) return "";
  const idx = headerIndex.get(header);
  if (idx === undefined) return "";
  return (row[idx] ?? "").trim();
}

/** Interpreta una fila cruda a `ParsedRow` según el mapeo. No clasifica ni valida requeridos. */
export function parseRow(
  row: string[],
  mapping: ColumnMapping,
  headerIndex: Map<string, number>,
): ParsedRow {
  const parseErrors: string[] = [];
  const cell = (f: keyof ColumnMapping) => cellOf(f, mapping, headerIndex, row);

  const codeRaw = cell("codigo");
  const nameRaw = cell("nombre");

  const wholesaleRaw = cell("precio_mayorista");
  let wholesale: number | null = null;
  if (wholesaleRaw !== "") {
    const n = parseArgNumber(wholesaleRaw);
    if (n === null || n < 0) parseErrors.push("Precio mayorista inválido");
    else wholesale = n;
  }

  const retailRaw = cell("precio_minorista");
  let retail: number | null = null;
  if (retailRaw !== "") {
    const n = parseArgNumber(retailRaw);
    if (n === null || n < 0) parseErrors.push("Precio minorista inválido");
    else retail = n;
  }

  const pricingRaw = cell("tipo_precio");
  const pricingUnit = pricingRaw === "" ? null : parsePricingUnit(pricingRaw);
  if (pricingRaw !== "" && pricingUnit === null) parseErrors.push("Tipo de precio inválido");

  const orderRaw = cell("forma_pedido");
  const orderMode = orderRaw === "" ? null : parseOrderMode(orderRaw);
  if (orderRaw !== "" && orderMode === null) parseErrors.push("Forma de pedido inválida");

  const weightRaw = cell("peso_promedio_kg");
  let avgPieceWeightKg: number | null = null;
  if (weightRaw !== "") {
    const n = parseArgNumber(weightRaw);
    if (n === null || n <= 0) parseErrors.push("Peso promedio inválido");
    else avgPieceWeightKg = n;
  }

  const brand = cell("marca");
  const category = cell("categoria");
  const presentation = cell("presentacion");

  return {
    code: normalizeCode(codeRaw),
    name: normalizeName(nameRaw),
    brand: brand === "" ? null : normalizeName(brand),
    category: category === "" ? null : normalizeName(category),
    presentation: presentation === "" ? null : normalizeName(presentation),
    pricingUnit,
    orderMode,
    avgPieceWeightKg,
    wholesale,
    retail,
    available: parseAvailable(cell("disponible")),
    parseErrors,
  };
}

/**
 * Valida los requeridos y la coherencia precio/pedido para un artículo NUEVO (ver
 * makeProductSchema en catalog.ts). Devuelve los mensajes de error (vacío = ok). La
 * importación solo define la estructura (unidad/kg) al crear; al actualizar no la toca.
 */
function validateForCreate(parsed: ParsedRow, usesOwnCodes: boolean, hasCodeColumn: boolean): string[] {
  const errors: string[] = [];
  if (parsed.name === "") errors.push("Falta el nombre");
  if (parsed.wholesale === null) errors.push("Falta el precio mayorista");
  if (usesOwnCodes && hasCodeColumn && parsed.code === "") errors.push("Falta el código");

  const pricing: PricingUnit = parsed.pricingUnit ?? "unit";
  const order: OrderMode = parsed.orderMode ?? (pricing === "kg" ? "kg" : "unit");
  if (pricing === "unit" && order !== "unit") {
    errors.push("Si el precio es por unidad, el pedido es por unidad");
  }
  if (pricing === "kg" && order === "unit") {
    errors.push("Si el precio es por kilo, el pedido es por pieza o por kilo");
  }
  if (pricing === "kg" && order === "piece" && parsed.avgPieceWeightKg === null) {
    errors.push("Falta el peso promedio de la pieza");
  }
  return errors;
}

/** Clasifica todas las filas de la planilla. */
export function buildPreview(input: PreviewInput): Preview {
  const { headers, rows, mapping, mode, existing, usesOwnCodes } = input;

  const headerIndex = new Map<string, number>();
  headers.forEach((h, i) => {
    if (!headerIndex.has(h)) headerIndex.set(h, i);
  });

  const hasCodeColumn = mapping.codigo !== null;

  // Índices de artículos existentes para cruzar.
  const byCode = new Map<string, ExistingProduct>();
  const byNamePres = new Map<string, ExistingProduct[]>();
  for (const p of existing) {
    byCode.set(normalizeCode(p.code), p);
    const key = namePresKey(p.name, p.presentation);
    const list = byNamePres.get(key);
    if (list) list.push(p);
    else byNamePres.set(key, [p]);
  }

  const parsedRows = rows.map((r) => parseRow(r, mapping, headerIndex));

  // Conteo de códigos repetidos dentro de la planilla (son error, no se importan).
  const codeCounts = new Map<string, number>();
  if (hasCodeColumn) {
    for (const p of parsedRows) {
      if (p.code !== "") codeCounts.set(p.code, (codeCounts.get(p.code) ?? 0) + 1);
    }
  }

  const previewRows: PreviewRow[] = parsedRows.map((parsed, index) => {
    const errors = [...parsed.parseErrors];
    let status: RowStatus = "create";
    let matchId: string | null = null;
    let skipReason: string | null = null;

    if (hasCodeColumn && parsed.code !== "" && (codeCounts.get(parsed.code) ?? 0) > 1) {
      errors.push("Código repetido en la planilla");
    }

    const crossByCode = hasCodeColumn && parsed.code !== "";
    let match: ExistingProduct | undefined;
    let ambiguous = false;
    if (crossByCode) {
      match = byCode.get(parsed.code);
    } else if (parsed.name !== "") {
      const list = byNamePres.get(namePresKey(parsed.name, parsed.presentation));
      if (list && list.length === 1) match = list[0];
      else if (list && list.length > 1) ambiguous = true;
    }

    // Posible duplicado: trae código nuevo pero ya hay un artículo con igual nombre+presentación.
    const possibleDup =
      crossByCode &&
      !match &&
      parsed.name !== "" &&
      (byNamePres.get(namePresKey(parsed.name, parsed.presentation))?.length ?? 0) > 0;

    if (errors.length > 0) {
      status = "error";
    } else if (ambiguous) {
      status = "error";
      errors.push("Coincide con más de un artículo por nombre y presentación");
    } else if (match) {
      matchId = match.id;
      if (mode === "add_only") {
        status = "skip";
        skipReason = "Ya existe (modo solo agregar)";
      } else {
        status = "update";
      }
    } else if (mode === "update_prices_only") {
      status = "skip";
      skipReason = "No existe (modo solo precios)";
    } else {
      const createErrors = validateForCreate(parsed, usesOwnCodes, hasCodeColumn);
      if (createErrors.length > 0) {
        status = "error";
        errors.push(...createErrors);
      } else {
        status = possibleDup ? "possible_duplicate" : "create";
      }
    }

    return {
      index,
      status,
      code: parsed.code,
      name: parsed.name,
      matchId,
      errors,
      skipReason,
      parsed,
    };
  });

  const summary: PreviewSummary = {
    create: previewRows.filter((r) => r.status === "create").length,
    update: previewRows.filter((r) => r.status === "update").length,
    possibleDuplicate: previewRows.filter((r) => r.status === "possible_duplicate").length,
    skip: previewRows.filter((r) => r.status === "skip").length,
    error: previewRows.filter((r) => r.status === "error").length,
  };

  return { rows: previewRows, summary };
}
