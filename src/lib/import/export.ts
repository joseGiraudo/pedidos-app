import * as XLSX from "xlsx";

import { CANONICAL_FIELDS } from "./mapping";

// Exportación de la lista de artículos a CSV y Excel, con los mismos encabezados que espera la
// importación (ver reglas-de-negocio.md). El código va como texto para no perder los ceros a la
// izquierda; los decimales con coma (formato local).

/** Artículo tal como sale de la consulta de exportación. */
export type ExportProduct = {
  code: string;
  name: string;
  brandName: string | null;
  categoryName: string | null;
  presentation: string | null;
  pricingUnit: "unit" | "kg";
  orderMode: "unit" | "piece" | "kg";
  avgPieceWeightKg: string | null;
  wholesalePrice: string;
  retailPrice: string | null;
  isAvailable: boolean;
};

const ORDER_MODE_LABELS: Record<ExportProduct["orderMode"], string> = {
  unit: "unidad",
  piece: "pieza",
  kg: "kg",
};

/** Número `numeric` de la base (con punto) a formato local (con coma). */
function comma(value: string): string {
  return value.replace(".", ",");
}

/** Una fila de artículo a las columnas canónicas, en el mismo orden que `CANONICAL_FIELDS`. */
function toCells(p: ExportProduct): string[] {
  return [
    p.code,
    p.name,
    p.brandName ?? "",
    p.categoryName ?? "",
    p.presentation ?? "",
    p.pricingUnit === "kg" ? "kg" : "unidad",
    ORDER_MODE_LABELS[p.orderMode],
    p.avgPieceWeightKg ? comma(p.avgPieceWeightKg) : "",
    comma(p.wholesalePrice),
    p.retailPrice ? comma(p.retailPrice) : "",
    p.isAvailable ? "si" : "no",
  ];
}

/** Escapa un valor para CSV (separador `;`): entrecomilla si hay `;`, comillas o saltos. */
function csvCell(value: string): string {
  if (/[";\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** CSV con separador `;`, UTF-8 con BOM y decimales con coma (ver reglas-de-negocio.md). */
export function buildCsv(products: ExportProduct[]): string {
  const lines = [CANONICAL_FIELDS.join(";")];
  for (const p of products) lines.push(toCells(p).map(csvCell).join(";"));
  return "﻿" + lines.join("\r\n");
}

/** Excel (.xlsx) con la columna de código forzada a formato texto (conserva ceros a la izquierda). */
export function buildXlsx(products: ExportProduct[]): Uint8Array<ArrayBuffer> {
  const aoa: string[][] = [[...CANONICAL_FIELDS], ...products.map(toCells)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Columna 0 = código: celdas como texto (type "s", formato "@") para que Excel no las vuelva número.
  for (let r = 1; r <= products.length; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: 0 });
    const cell = ws[ref];
    if (cell) {
      cell.t = "s";
      cell.z = "@";
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Artículos");
  // Copia a un Uint8Array con ArrayBuffer concreto (el de SheetJS es genérico y no encaja en BlobPart).
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array);
}
