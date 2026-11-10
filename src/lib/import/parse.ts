import Papa from "papaparse";
import * as XLSX from "xlsx";

// Lectura de planillas (CSV y Excel) a una matriz de strings. Es la capa más baja de la
// importación: no interpreta columnas ni valida nada, solo entrega encabezados y filas en
// crudo para que el mapeo y la vista previa trabajen después (ver docs/requisitos.md →
// "Importación y exportación"). Todo se devuelve como string para preservar los ceros a la
// izquierda de los códigos (el código es texto, no número).

/** Planilla cruda: primera fila como encabezados, el resto como filas de celdas string. */
export type RawSheet = {
  headers: string[];
  rows: string[][];
};

/** Quita el BOM inicial (las planillas en CSV suelen venir en UTF-8 con BOM). */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** Cualquier celda (número, booleano, nulo) a string recortado. */
function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** Ajusta una fila al ancho de los encabezados (rellena o recorta). */
function normalizeWidth(row: string[], width: number): string[] {
  if (row.length === width) return row;
  if (row.length > width) return row.slice(0, width);
  return [...row, ...Array<string>(width - row.length).fill("")];
}

/**
 * Convierte una matriz cruda en `RawSheet`: toma como encabezados la primera fila que
 * tenga algún dato, normaliza el ancho de las demás y descarta las filas totalmente
 * vacías (celdas en blanco entre medio no se pierden; una fila sin ningún dato sí).
 */
function matrixToSheet(matrix: unknown[][]): RawSheet {
  const rows = matrix.map((r) => r.map(cellToString));
  const headerIdx = rows.findIndex((r) => r.some((c) => c !== ""));
  if (headerIdx === -1) return { headers: [], rows: [] };

  const headers = rows[headerIdx];
  const width = headers.length;
  const dataRows = rows
    .slice(headerIdx + 1)
    .map((r) => normalizeWidth(r, width))
    .filter((r) => r.some((c) => c !== ""));

  return { headers, rows: dataRows };
}

/**
 * Parsea un CSV a `RawSheet`. Autodetecta el separador (tolera `;` y `,`, ver
 * reglas-de-negocio.md) y quita el BOM. No interpreta tipos: todo queda como string.
 */
export function parseCsv(text: string): RawSheet {
  const result = Papa.parse<string[]>(stripBom(text), { skipEmptyLines: "greedy" });
  return matrixToSheet(result.data ?? []);
}

/**
 * Parsea un Excel (.xlsx) a `RawSheet` leyendo la primera hoja. `raw: false` toma el valor
 * formateado como lo ve el usuario (así un código "007" guardado como texto conserva los
 * ceros a la izquierda); `defval: ""` mantiene las celdas vacías en su posición.
 */
export function parseXlsx(data: ArrayBuffer | Uint8Array): RawSheet {
  const wb = XLSX.read(data, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return matrixToSheet(matrix);
}
