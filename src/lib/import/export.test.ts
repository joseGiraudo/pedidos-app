import { describe, expect, it } from "vitest";

import { buildCsv, buildXlsx, type ExportProduct } from "./export";
import { autoDetectMapping } from "./mapping";
import { parseCsv, parseXlsx } from "./parse";

const SAMPLE: ExportProduct[] = [
  {
    code: "007",
    name: "Caramelo surtido",
    brandName: "Arcor",
    categoryName: "Golosinas",
    presentation: "Bolsa x 50",
    pricingUnit: "unit",
    orderMode: "unit",
    avgPieceWeightKg: null,
    wholesalePrice: "1250.00",
    retailPrice: "1500.00",
    isAvailable: true,
  },
  {
    code: "QUE-1",
    name: "Queso cremoso",
    brandName: null,
    categoryName: null,
    presentation: "Horma",
    pricingUnit: "kg",
    orderMode: "piece",
    avgPieceWeightKg: "4.200",
    wholesalePrice: "8000.00",
    retailPrice: null,
    isAvailable: false,
  },
];

describe("buildCsv", () => {
  it("usa separador ';', BOM y decimales con coma", () => {
    const csv = buildCsv(SAMPLE);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0].split(";")).toContain("precio_mayorista");
    expect(lines[1]).toContain("1250,00");
  });

  it("round-trip: exportar y volver a parsear preserva código y detecta el mapeo", () => {
    const sheet = parseCsv(buildCsv(SAMPLE));
    const mapping = autoDetectMapping(sheet.headers);
    expect(mapping.codigo).toBe("codigo");
    expect(mapping.nombre).toBe("nombre");
    expect(mapping.precio_mayorista).toBe("precio_mayorista");

    const codeIdx = sheet.headers.indexOf("codigo");
    expect(sheet.rows[0][codeIdx]).toBe("007");

    const dispIdx = sheet.headers.indexOf("disponible");
    expect(sheet.rows[0][dispIdx]).toBe("si");
    expect(sheet.rows[1][dispIdx]).toBe("no");
  });
});

describe("buildXlsx", () => {
  it("round-trip: conserva los ceros a la izquierda del código", () => {
    const sheet = parseXlsx(buildXlsx(SAMPLE));
    const codeIdx = sheet.headers.indexOf("codigo");
    expect(sheet.rows[0][codeIdx]).toBe("007");
    expect(sheet.rows[1][codeIdx]).toBe("QUE-1");
  });

  it("exporta tipo_precio y forma_pedido en castellano", () => {
    const sheet = parseXlsx(buildXlsx(SAMPLE));
    const tipoIdx = sheet.headers.indexOf("tipo_precio");
    const formaIdx = sheet.headers.indexOf("forma_pedido");
    expect(sheet.rows[1][tipoIdx]).toBe("kg");
    expect(sheet.rows[1][formaIdx]).toBe("pieza");
  });
});
