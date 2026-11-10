"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { brands, categories, priceChanges, priceUpdateBatches, products, suppliers } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { fromCents, toCents } from "@/lib/pricing";
import { getCurrentActor, getCurrentTenant } from "@/lib/session";
import { tenantEq, withTenant, type Tenant } from "@/lib/tenant";
import { nextGeneratedCode } from "@/lib/validations/catalog";

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
  type MissingAction,
  type PreviewSummary,
  type RowStatus,
} from "@/lib/import/preview";

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a iniciar sesión.";
const BAD_FILE = "No se pudo leer el archivo. Subí un CSV o un Excel (.xlsx).";
const EMPTY_FILE = "La planilla está vacía o no tiene encabezados.";
const MAX_ROWS = 5000;
const TOO_BIG = `La planilla supera el máximo de ${MAX_ROWS} filas.`;

const IMPORT_MODES: ImportMode[] = ["upsert", "add_only", "update_prices_only"];
const MISSING_ACTIONS: MissingAction[] = ["keep", "mark_out_of_stock", "deactivate"];
const NOTHING = "No hay nada para importar con las opciones elegidas.";

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

function readMissingAction(raw: unknown): MissingAction {
  return MISSING_ACTIONS.includes(raw as MissingAction) ? (raw as MissingAction) : "keep";
}

/** Monto a string `numeric(…,2)` operando en centavos enteros (regla de dinero). */
function money(n: number): string {
  return fromCents(toCents(n));
}

/** Peso a string `numeric(…,3)`. */
function weight(n: number): string {
  return n.toFixed(3);
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

/** Artículo existente con todos los campos que el aplicar necesita leer/comparar. */
type ExistingFull = {
  id: string;
  code: string;
  name: string;
  presentation: string | null;
  codeIsGenerated: boolean;
  brandId: string | null;
  categoryId: string | null;
  wholesalePrice: string;
  retailPrice: string | null;
  isAvailable: boolean;
  isActive: boolean;
};

export type ApplyResult =
  | { ok: true; created: number; updated: number; missing: number }
  | { error: string };

/** Fecha dd/mm/aaaa para la descripción del batch (formato local, ver CLAUDE.md). */
function todayLabel(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Aplica la importación en una transacción: crea/actualiza artículos cruzados por la vista
 * previa (re-clasificada en el servidor, nunca se confía en el cliente), genera códigos
 * faltantes, crea marcas/categorías nuevas, graba un `price_update_batches` (kind=import) con
 * sus `price_changes`, aplica la acción para los artículos ausentes y recuerda el mapeo.
 */
export async function applyImport(input: {
  headers: string[];
  rows: string[][];
  mapping: ColumnMapping;
  mode: unknown;
  missingAction: unknown;
}): Promise<ApplyResult> {
  const actor = await getCurrentActor();
  if (!actor) return { error: SESSION_EXPIRED };
  const tenant: Tenant = { supplierId: actor.supplierId };

  if (!Array.isArray(input.rows) || !Array.isArray(input.headers)) return { error: BAD_FILE };
  if (input.rows.length > MAX_ROWS) return { error: TOO_BIG };

  const mode = readMode(input.mode);
  const missingAction = readMissingAction(input.missingAction);

  const [supplier] = await db
    .select({
      usesOwnCodes: suppliers.usesOwnCodes,
      useBrands: suppliers.useBrands,
      useCategories: suppliers.useCategories,
    })
    .from(suppliers)
    .where(eq(suppliers.id, tenant.supplierId))
    .limit(1);
  if (!supplier) return { error: SESSION_EXPIRED };

  const mappingError = validateMapping(input.mapping, supplier.usesOwnCodes);
  if (mappingError) return { error: mappingError };

  try {
    const result = await db.transaction(async (tx) => {
      const existingRows: ExistingFull[] = await tx
        .select({
          id: products.id,
          code: products.code,
          name: products.name,
          presentation: products.presentation,
          codeIsGenerated: products.codeIsGenerated,
          brandId: products.brandId,
          categoryId: products.categoryId,
          wholesalePrice: products.wholesalePrice,
          retailPrice: products.retailPrice,
          isAvailable: products.isAvailable,
          isActive: products.isActive,
        })
        .from(products)
        .where(tenantEq(products, tenant));

      const byId = new Map(existingRows.map((r) => [r.id, r]));
      const existing: ExistingProduct[] = existingRows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        presentation: r.presentation,
        codeIsGenerated: r.codeIsGenerated,
      }));

      const preview = buildPreview({
        headers: input.headers,
        rows: input.rows,
        mapping: input.mapping,
        mode,
        existing,
        usesOwnCodes: supplier.usesOwnCodes,
      });

      // Resolución de marcas/categorías (crea las nuevas una sola vez). Clave en minúsculas.
      const brandMap = new Map<string, string>();
      const categoryMap = new Map<string, string>();
      if (supplier.useBrands) {
        const rows = await tx
          .select({ id: brands.id, name: brands.name })
          .from(brands)
          .where(tenantEq(brands, tenant));
        for (const b of rows) brandMap.set(b.name.toLowerCase(), b.id);
      }
      if (supplier.useCategories) {
        const rows = await tx
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(tenantEq(categories, tenant));
        for (const c of rows) categoryMap.set(c.name.toLowerCase(), c.id);
      }
      async function resolveBrand(name: string | null): Promise<string | null> {
        if (!supplier.useBrands || !name) return null;
        const key = name.toLowerCase();
        const found = brandMap.get(key);
        if (found) return found;
        const [row] = await tx
          .insert(brands)
          .values(withTenant({ name }, tenant))
          .returning({ id: brands.id });
        brandMap.set(key, row.id);
        return row.id;
      }
      async function resolveCategory(name: string | null): Promise<string | null> {
        if (!supplier.useCategories || !name) return null;
        const key = name.toLowerCase();
        const found = categoryMap.get(key);
        if (found) return found;
        const [row] = await tx
          .insert(categories)
          .values(withTenant({ name }, tenant))
          .returning({ id: categories.id });
        categoryMap.set(key, row.id);
        return row.id;
      }

      // Generación de códigos (solo si el proveedor no usa códigos propios). Bloquea la fila
      // del proveedor y salta los códigos ya tomados (mismo patrón que createProduct).
      let nextCode = 0;
      const taken = new Set(existingRows.map((r) => r.code));
      let generatedAny = false;
      if (!supplier.usesOwnCodes) {
        const [{ from }] = await tx
          .select({ from: suppliers.nextProductCode })
          .from(suppliers)
          .where(eq(suppliers.id, tenant.supplierId))
          .for("update");
        nextCode = from;
      }
      function genCode(): string {
        const gen = nextGeneratedCode(nextCode, (c) => taken.has(c));
        nextCode = gen.next;
        taken.add(gen.code);
        generatedAny = true;
        return gen.code;
      }

      // --- Altas ---
      const createRows = preview.rows.filter(
        (r) => r.status === "create" || r.status === "possible_duplicate",
      );
      for (const row of createRows) {
        const p = row.parsed;
        const code = supplier.usesOwnCodes ? p.code : genCode();
        const pricing = p.pricingUnit ?? "unit";
        const order = pricing === "unit" ? "unit" : (p.orderMode ?? "kg");
        const avg =
          pricing === "kg" && order === "piece" && p.avgPieceWeightKg !== null
            ? weight(p.avgPieceWeightKg)
            : null;

        await tx.insert(products).values(
          withTenant(
            {
              code,
              codeIsGenerated: !supplier.usesOwnCodes,
              name: p.name,
              brandId: await resolveBrand(p.brand),
              categoryId: await resolveCategory(p.category),
              presentation: p.presentation,
              pricingUnit: pricing,
              orderMode: order,
              avgPieceWeightKg: avg,
              wholesalePrice: money(p.wholesale ?? 0),
              retailPrice: p.retail !== null ? money(p.retail) : null,
              isAvailable: p.available ?? true,
            },
            tenant,
          ),
        );
      }
      if (generatedAny) {
        await tx
          .update(suppliers)
          .set({ nextProductCode: nextCode })
          .where(eq(suppliers.id, tenant.supplierId));
      }

      // --- Actualizaciones --- (celdas vacías no borran; el modo "solo precios" ignora el resto)
      type UpdateOp = {
        id: string;
        set: Record<string, unknown>;
        priceChange: { oldW: string; newW: string; oldR: string | null; newR: string | null } | null;
      };
      const updateOps: UpdateOp[] = [];
      for (const row of preview.rows) {
        if (row.status !== "update" || !row.matchId) continue;
        const current = byId.get(row.matchId);
        if (!current) continue;
        const p = row.parsed;
        const set: Record<string, unknown> = {};

        let newW = current.wholesalePrice;
        let newR = current.retailPrice;
        if (p.wholesale !== null) {
          const m = money(p.wholesale);
          if (m !== current.wholesalePrice) {
            set.wholesalePrice = m;
            newW = m;
          }
        }
        if (p.retail !== null) {
          const m = money(p.retail);
          if (m !== current.retailPrice) {
            set.retailPrice = m;
            newR = m;
          }
        }

        if (mode !== "update_prices_only") {
          if (p.name !== "" && p.name !== current.name) set.name = p.name;
          if (p.presentation !== null && p.presentation !== current.presentation) {
            set.presentation = p.presentation;
          }
          if (supplier.useBrands && p.brand !== null) {
            const bid = await resolveBrand(p.brand);
            if (bid !== current.brandId) set.brandId = bid;
          }
          if (supplier.useCategories && p.category !== null) {
            const cid = await resolveCategory(p.category);
            if (cid !== current.categoryId) set.categoryId = cid;
          }
          if (p.available !== null && p.available !== current.isAvailable) {
            set.isAvailable = p.available;
          }
        }

        if (Object.keys(set).length === 0) continue;
        const priceChanged = set.wholesalePrice !== undefined || set.retailPrice !== undefined;
        updateOps.push({
          id: current.id,
          set,
          priceChange: priceChanged
            ? { oldW: current.wholesalePrice, newW, oldR: current.retailPrice, newR }
            : null,
        });
      }

      const created = createRows.length;
      const updated = updateOps.length;

      // --- Batch de la importación --- (agrupa altas y actualizaciones; price_changes por precio)
      let batchId: string | null = null;
      if (created + updated > 0) {
        const [batch] = await tx
          .insert(priceUpdateBatches)
          .values(
            withTenant(
              {
                kind: "import" as const,
                description: `Importación del ${todayLabel()}`,
                percentage: null,
                rounding: null,
                roundingMode: null,
                target: "both" as const,
                affectedCount: created + updated,
                createdBy: actor.userId,
              },
              tenant,
            ),
          )
          .returning({ id: priceUpdateBatches.id });
        batchId = batch.id;
      }

      for (const op of updateOps) {
        await tx
          .update(products)
          .set(op.set)
          .where(and(eq(products.id, op.id), tenantEq(products, tenant)));
        if (op.priceChange) {
          await tx.insert(priceChanges).values({
            productId: op.id,
            batchId,
            oldWholesale: op.priceChange.oldW,
            newWholesale: op.priceChange.newW,
            oldRetail: op.priceChange.oldR,
            newRetail: op.priceChange.newR,
            createdBy: actor.userId,
          });
        }
      }

      // --- Artículos ausentes de la planilla ---
      let missing = 0;
      if (missingAction !== "keep") {
        const touched = new Set(
          preview.rows.map((r) => r.matchId).filter((id): id is string => !!id),
        );
        const missingRows = existingRows.filter((r) => !touched.has(r.id));
        const targets =
          missingAction === "deactivate"
            ? missingRows.filter((r) => r.isActive)
            : missingRows.filter((r) => r.isAvailable);
        const ids = targets.map((r) => r.id);
        if (ids.length > 0) {
          await tx
            .update(products)
            .set(missingAction === "deactivate" ? { isActive: false } : { isAvailable: false })
            .where(and(tenantEq(products, tenant), inArray(products.id, ids)));
          missing = ids.length;
        }
      }

      // Recuerda el mapeo usado para la próxima importación.
      await tx
        .update(suppliers)
        .set({ importColumnMapping: input.mapping })
        .where(eq(suppliers.id, tenant.supplierId));

      return { created, updated, missing };
    });

    if (result.created + result.updated + result.missing === 0) return { error: NOTHING };

    revalidatePath("/panel/articulos");
    return { ok: true, ...result };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Hay un código repetido con el catálogo." };
    throw error;
  }
}
