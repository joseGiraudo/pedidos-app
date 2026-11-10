"use server";

import { db } from "@/db";
import { products, suppliers } from "@/db/schema";
import { tenantEq } from "@/lib/tenant";
import { getCurrentTenant } from "@/lib/session";
import { eq } from "drizzle-orm";

import {
  autoDetectMapping,
  reconcileMapping,
  type ColumnMapping,
} from "@/lib/import/mapping";
import { parseCsv, parseXlsx, type RawSheet } from "@/lib/import/parse";
import {
  buildPreview,
  type ExistingProduct,
  type ImportMode,
  type PreviewSummary,
  type RowStatus,
} from "@/lib/import/preview";

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a iniciar sesión.";
const BAD_FILE = "No se pudo leer el archivo. Subí un CSV o un Excel (.xlsx).";
const EMPTY_FILE = "La planilla está vacía o no tiene encabezados.";
const MAX_ROWS = 5000;
const TOO_BIG = `La planilla supera el máximo de ${MAX_ROWS} filas.`;

const IMPORT_MODES: ImportMode[] = ["upsert", "add_only", "update_prices_only"];

export type ParseResult =
  | {
      ok: true;
      sheet: RawSheet;
      mapping: ColumnMapping;
      savedMapping: boolean;
      codeMayHaveLostZeros: boolean;
    }
  | { error: string };

export type PreviewRowDto = {
  index: number;
  status: RowStatus;
  code: string;
  name: string;
  errors: string[];
  skipReason: string | null;
};

export type PreviewResult =
  | { ok: true; summary: PreviewSummary; rows: PreviewRowDto[] }
  | { error: string };

/** Lee el archivo subido, lo parsea y propone el mapeo (guardado o auto-detectado). */
export async function parseSpreadsheet(formData: FormData): Promise<ParseResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: BAD_FILE };

  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

  let sheet: RawSheet;
  try {
    sheet = isCsv ? parseCsv(await file.text()) : parseXlsx(await file.arrayBuffer());
  } catch {
    return { error: BAD_FILE };
  }

  if (sheet.headers.length === 0) return { error: EMPTY_FILE };
  if (sheet.rows.length > MAX_ROWS) return { error: TOO_BIG };

  const [supplier] = await db
    .select({ importColumnMapping: suppliers.importColumnMapping })
    .from(suppliers)
    .where(eq(suppliers.id, tenant.supplierId))
    .limit(1);

  const saved = supplier?.importColumnMapping
    ? reconcileMapping(supplier.importColumnMapping as ColumnMapping, sheet.headers)
    : null;
  const hasSaved = saved !== null && Object.values(saved).some((v) => v !== null);
  const mapping = hasSaved ? saved : autoDetectMapping(sheet.headers);

  return {
    ok: true,
    sheet,
    mapping,
    savedMapping: hasSaved,
    codeMayHaveLostZeros: detectLostZeros(isCsv, sheet, mapping),
  };
}

/**
 * Avisa si el Excel pudo haber perdido ceros a la izquierda del código: solo aplica a .xlsx
 * (en CSV el código es texto) y cuando la columna de código tiene valores todos numéricos.
 */
function detectLostZeros(isCsv: boolean, sheet: RawSheet, mapping: ColumnMapping): boolean {
  if (isCsv || !mapping.codigo) return false;
  const idx = sheet.headers.indexOf(mapping.codigo);
  if (idx === -1) return false;
  const values = sheet.rows.map((r) => (r[idx] ?? "").trim()).filter((v) => v !== "");
  return values.length > 0 && values.every((v) => /^\d+$/.test(v));
}

/** Carga los artículos del proveedor para cruzar al importar (activos e inactivos). */
async function loadExisting(supplierId: string): Promise<ExistingProduct[]> {
  return db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      presentation: products.presentation,
      codeIsGenerated: products.codeIsGenerated,
    })
    .from(products)
    .where(tenantEq(products, { supplierId }));
}

function readMode(raw: unknown): ImportMode {
  return IMPORT_MODES.includes(raw as ImportMode) ? (raw as ImportMode) : "upsert";
}

/** Valida que el mapeo tenga lo mínimo (nombre y precio mayorista; código si se usan propios). */
export function validateMapping(mapping: ColumnMapping, usesOwnCodes: boolean): string | null {
  if (!mapping.nombre) return "Falta asignar la columna de Nombre.";
  if (!mapping.precio_mayorista) return "Falta asignar la columna de Precio mayorista.";
  if (usesOwnCodes && !mapping.codigo) return "Usás códigos propios: asigná la columna de Código.";
  return null;
}

/** Clasifica la planilla contra el catálogo actual (crear/actualizar/duplicado/omitir/error). */
export async function previewImport(input: {
  headers: string[];
  rows: string[][];
  mapping: ColumnMapping;
  mode: unknown;
}): Promise<PreviewResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  if (!Array.isArray(input.rows) || !Array.isArray(input.headers)) return { error: BAD_FILE };
  if (input.rows.length > MAX_ROWS) return { error: TOO_BIG };

  const [supplier] = await db
    .select({ usesOwnCodes: suppliers.usesOwnCodes })
    .from(suppliers)
    .where(eq(suppliers.id, tenant.supplierId))
    .limit(1);
  if (!supplier) return { error: SESSION_EXPIRED };

  const mappingError = validateMapping(input.mapping, supplier.usesOwnCodes);
  if (mappingError) return { error: mappingError };

  const existing = await loadExisting(tenant.supplierId);

  const preview = buildPreview({
    headers: input.headers,
    rows: input.rows,
    mapping: input.mapping,
    mode: readMode(input.mode),
    existing,
    usesOwnCodes: supplier.usesOwnCodes,
  });

  return {
    ok: true,
    summary: preview.summary,
    rows: preview.rows.map((r) => ({
      index: r.index,
      status: r.status,
      code: r.code,
      name: r.name,
      errors: r.errors,
      skipReason: r.skipReason,
    })),
  };
}
