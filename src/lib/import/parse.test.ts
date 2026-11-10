import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseCsv, parseXlsx } from "./parse";

describe("parseCsv", () => {
  it("lee encabezados y filas con separador ';'", () => {
    const csv = "codigo;nombre;precio_mayorista\nALF-024;Alfajor triple;12500,00\n";
    const sheet = parseCsv(csv);
    expect(sheet.headers).toEqual(["codigo", "nombre", "precio_mayorista"]);
    expect(sheet.rows).toEqual([["ALF-024", "Alfajor triple", "12500,00"]]);
  });

  it("también tolera el separador ','", () => {
    const csv = "codigo,nombre\n001,Agua\n";
    const sheet = parseCsv(csv);
    expect(sheet.headers).toEqual(["codigo", "nombre"]);
    expect(sheet.rows).toEqual([["001", "Agua"]]);
  });

  it("quita el BOM del primer encabezado", () => {
    const csv = "﻿codigo;nombre\n007;Caramelo\n";
    const sheet = parseCsv(csv);
    expect(sheet.headers[0]).toBe("codigo");
  });

  it("preserva los ceros a la izquierda del código", () => {
    const sheet = parseCsv("codigo;nombre\n007;Caramelo\n");
    expect(sheet.rows[0][0]).toBe("007");
  });

  it("descarta filas totalmente vacías pero conserva celdas vacías", () => {
    const csv = "codigo;nombre;marca\n001;Agua;\n\n002;Gaseosa;Cola\n";
    const sheet = parseCsv(csv);
    expect(sheet.rows).toEqual([
      ["001", "Agua", ""],
      ["002", "Gaseosa", "Cola"],
    ]);
  });

  it("devuelve vacío si no hay contenido", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
  });
});

/** Construye un .xlsx en memoria a partir de una matriz para probar el parseo. */
function buildXlsx(matrix: (string | number)[][]): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

describe("parseXlsx", () => {
  it("lee la primera hoja como matriz de strings", () => {
    const buf = buildXlsx([
      ["codigo", "nombre", "precio_mayorista"],
      ["ALF-024", "Alfajor triple", 12500],
    ]);
    const sheet = parseXlsx(buf);
    expect(sheet.headers).toEqual(["codigo", "nombre", "precio_mayorista"]);
    expect(sheet.rows[0][0]).toBe("ALF-024");
    expect(sheet.rows[0][1]).toBe("Alfajor triple");
    expect(sheet.rows[0][2]).toBe("12500");
  });

  it("preserva un código de texto con ceros a la izquierda", () => {
    const buf = buildXlsx([
      ["codigo", "nombre"],
      ["007", "Caramelo"],
    ]);
    const sheet = parseXlsx(buf);
    expect(sheet.rows[0][0]).toBe("007");
  });

  it("rellena las celdas vacías del final de una fila corta", () => {
    const buf = buildXlsx([
      ["codigo", "nombre", "marca"],
      ["001", "Agua"],
    ]);
    const sheet = parseXlsx(buf);
    expect(sheet.rows[0]).toEqual(["001", "Agua", ""]);
  });
});
