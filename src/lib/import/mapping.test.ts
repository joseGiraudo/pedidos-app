import { describe, expect, it } from "vitest";

import {
  autoDetectMapping,
  emptyMapping,
  normalizeHeader,
  parseAvailable,
  parseOrderMode,
  parsePricingUnit,
  reconcileMapping,
  validateMapping,
} from "./mapping";

describe("normalizeHeader", () => {
  it("quita acentos, pasa a minúsculas y colapsa separadores", () => {
    expect(normalizeHeader("Categoría")).toBe("categoria");
    expect(normalizeHeader("P. Lista")).toBe("p lista");
    expect(normalizeHeader("precio_mayorista")).toBe("precio mayorista");
    expect(normalizeHeader("  Descripción  ")).toBe("descripcion");
  });
});

describe("autoDetectMapping", () => {
  it("mapea los encabezados canónicos", () => {
    const m = autoDetectMapping(["codigo", "nombre", "precio_mayorista"]);
    expect(m.codigo).toBe("codigo");
    expect(m.nombre).toBe("nombre");
    expect(m.precio_mayorista).toBe("precio_mayorista");
  });

  it("reconoce sinónimos y variantes con acento/mayúsculas", () => {
    const m = autoDetectMapping(["COD.", "Descripción", "Rubro", "P. Lista"]);
    expect(m.codigo).toBe("COD.");
    expect(m.nombre).toBe("Descripción");
    expect(m.categoria).toBe("Rubro");
    expect(m.precio_mayorista).toBe("P. Lista");
  });

  it("deja en null lo que no reconoce", () => {
    const m = autoDetectMapping(["nombre", "xyz"]);
    expect(m.nombre).toBe("nombre");
    expect(m.marca).toBeNull();
  });

  it("asigna cada encabezado a un solo campo", () => {
    const m = autoDetectMapping(["precio_mayorista", "precio_minorista"]);
    expect(m.precio_mayorista).toBe("precio_mayorista");
    expect(m.precio_minorista).toBe("precio_minorista");
  });

  it("'precio' solo mapea al mayorista", () => {
    const m = autoDetectMapping(["codigo", "precio"]);
    expect(m.precio_mayorista).toBe("precio");
    expect(m.precio_minorista).toBeNull();
  });
});

describe("reconcileMapping", () => {
  it("descarta campos cuyo encabezado ya no existe", () => {
    const saved = { ...emptyMapping(), codigo: "COD", nombre: "Detalle" };
    const m = reconcileMapping(saved, ["COD", "Precio"]);
    expect(m.codigo).toBe("COD");
    expect(m.nombre).toBeNull();
  });
});

describe("validateMapping", () => {
  const base = () => ({
    ...emptyMapping(),
    nombre: "Nombre",
    precio_mayorista: "Precio",
  });

  it("acepta un mapeo con nombre y precio mayorista", () => {
    expect(validateMapping(base(), false)).toBeNull();
  });

  it("exige la columna de nombre", () => {
    expect(validateMapping({ ...base(), nombre: null }, false)).toBe(
      "Falta asignar la columna de Nombre.",
    );
  });

  it("exige la columna de precio mayorista", () => {
    expect(validateMapping({ ...base(), precio_mayorista: null }, false)).toBe(
      "Falta asignar la columna de Precio mayorista.",
    );
  });

  it("exige código cuando el proveedor usa códigos propios", () => {
    expect(validateMapping(base(), true)).toBe(
      "Usás códigos propios: asigná la columna de Código.",
    );
    expect(validateMapping({ ...base(), codigo: "COD" }, true)).toBeNull();
  });

  it("no exige código cuando el proveedor no usa códigos propios", () => {
    expect(validateMapping(base(), false)).toBeNull();
  });
});

describe("parsers de celda", () => {
  it("parsePricingUnit", () => {
    expect(parsePricingUnit("unidad")).toBe("unit");
    expect(parsePricingUnit("KG")).toBe("kg");
    expect(parsePricingUnit("")).toBeNull();
    expect(parsePricingUnit("raro")).toBeNull();
  });

  it("parseOrderMode", () => {
    expect(parseOrderMode("unidad")).toBe("unit");
    expect(parseOrderMode("pieza")).toBe("piece");
    expect(parseOrderMode("kg")).toBe("kg");
    expect(parseOrderMode("")).toBeNull();
  });

  it("parseAvailable", () => {
    expect(parseAvailable("si")).toBe(true);
    expect(parseAvailable("Sí")).toBe(true);
    expect(parseAvailable("no")).toBe(false);
    expect(parseAvailable("")).toBeNull();
    expect(parseAvailable("quizas")).toBeNull();
  });
});
