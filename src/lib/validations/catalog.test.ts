import { describe, expect, it } from "vitest";

import {
  generateProductCode,
  makeProductSchema,
  nextGeneratedCode,
  normalizeCode,
  normalizeName,
  parseArgNumber,
  taxonomyNameSchema,
  toProductValues,
  type ProductFormValues,
} from "./catalog";

describe("normalizeName", () => {
  it("recorta las puntas", () => {
    expect(normalizeName("  Golosinas  ")).toBe("Golosinas");
  });

  it("colapsa espacios y tabs internos", () => {
    expect(normalizeName("Yerba   mate")).toBe("Yerba mate");
    expect(normalizeName("Agua\tsaborizada")).toBe("Agua saborizada");
  });
});

describe("taxonomyNameSchema", () => {
  it("acepta un nombre válido y lo normaliza", () => {
    const result = taxonomyNameSchema.parse({ name: "  Bebidas   sin  alcohol " });
    expect(result.name).toBe("Bebidas sin alcohol");
  });

  it("rechaza vacío o solo espacios", () => {
    expect(taxonomyNameSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(taxonomyNameSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rechaza más de 60 caracteres", () => {
    expect(taxonomyNameSchema.safeParse({ name: "a".repeat(61) }).success).toBe(false);
  });
});

describe("normalizeCode", () => {
  it("recorta, colapsa espacios y pasa a mayúsculas", () => {
    expect(normalizeCode("  alf-024 ")).toBe("ALF-024");
    expect(normalizeCode("abc   123")).toBe("ABC 123");
  });

  it("deja igual un código ya normalizado", () => {
    expect(normalizeCode("ALF-024")).toBe("ALF-024");
    expect(normalizeCode("0001")).toBe("0001");
  });
});

describe("nextGeneratedCode", () => {
  const none = () => false;

  it("sin códigos tomados arranca en el contador y lo avanza en 1", () => {
    expect(nextGeneratedCode(1, none)).toEqual({ code: "0001", next: 2 });
  });

  it("respeta un contador arbitrario", () => {
    expect(nextGeneratedCode(42, none)).toEqual({ code: "0042", next: 43 });
  });

  it("salta los códigos ya tomados desde el inicio", () => {
    const taken = new Set(["0001", "0002"]);
    expect(nextGeneratedCode(1, (c) => taken.has(c))).toEqual({ code: "0003", next: 4 });
  });

  it("salta una colisión puntual en el medio", () => {
    const taken = new Set(["0003"]);
    expect(nextGeneratedCode(3, (c) => taken.has(c))).toEqual({ code: "0004", next: 5 });
  });

  it("nunca genera por debajo de 1", () => {
    expect(nextGeneratedCode(0, none)).toEqual({ code: "0001", next: 2 });
  });
});

describe("generateProductCode", () => {
  it("rellena con ceros a la izquierda hasta 4 dígitos", () => {
    expect(generateProductCode(1)).toBe("0001");
    expect(generateProductCode(42)).toBe("0042");
  });

  it("no recorta números de más de 4 dígitos", () => {
    expect(generateProductCode(12345)).toBe("12345");
  });
});

describe("parseArgNumber", () => {
  it("interpreta coma como decimal y punto como miles", () => {
    expect(parseArgNumber("12.500,50")).toBe(12500.5);
    expect(parseArgNumber("12500,50")).toBe(12500.5);
    expect(parseArgNumber("1.000.000")).toBe(1000000);
    expect(parseArgNumber("4,2")).toBe(4.2);
  });

  it("acepta enteros simples", () => {
    expect(parseArgNumber("300")).toBe(300);
  });

  it("devuelve null para vacío o inválido", () => {
    expect(parseArgNumber("")).toBeNull();
    expect(parseArgNumber("   ")).toBeNull();
    expect(parseArgNumber("abc")).toBeNull();
    expect(parseArgNumber("12,3,4")).toBeNull();
  });
});

// Base de valores válidos de un artículo por unidad; cada test pisa lo que necesita.
const baseValues: ProductFormValues = {
  code: "ALF-024",
  name: "Alfajor triple",
  brandId: "",
  categoryId: "",
  presentation: "",
  unitsPerPack: "",
  pricingUnit: "unit",
  orderMode: "unit",
  avgPieceWeightKg: "",
  wholesalePrice: "12500,00",
  retailPrice: "",
  isAvailable: true,
};

describe("makeProductSchema", () => {
  it("acepta un artículo por unidad válido", () => {
    expect(makeProductSchema(true).safeParse(baseValues).success).toBe(true);
  });

  it("exige código solo cuando el proveedor usa códigos propios", () => {
    const sinCodigo = { ...baseValues, code: "" };
    expect(makeProductSchema(true).safeParse(sinCodigo).success).toBe(false);
    expect(makeProductSchema(false).safeParse(sinCodigo).success).toBe(true);
  });

  it("rechaza precio mayorista inválido o vacío", () => {
    expect(makeProductSchema(true).safeParse({ ...baseValues, wholesalePrice: "" }).success).toBe(
      false,
    );
    expect(
      makeProductSchema(true).safeParse({ ...baseValues, wholesalePrice: "abc" }).success,
    ).toBe(false);
  });

  it("por kilo exige una forma de pedido (no 'unit')", () => {
    const porKilo = { ...baseValues, pricingUnit: "kg" as const, orderMode: "unit" as const };
    expect(makeProductSchema(true).safeParse(porKilo).success).toBe(false);
  });

  it("por kilo y por pieza exige el peso promedio", () => {
    const sinPeso = {
      ...baseValues,
      pricingUnit: "kg" as const,
      orderMode: "piece" as const,
      avgPieceWeightKg: "",
    };
    expect(makeProductSchema(true).safeParse(sinPeso).success).toBe(false);

    const conPeso = { ...sinPeso, avgPieceWeightKg: "4,2" };
    expect(makeProductSchema(true).safeParse(conPeso).success).toBe(true);
  });

  it("acepta por kilo pedido por kilo sin peso promedio", () => {
    const porKilo = { ...baseValues, pricingUnit: "kg" as const, orderMode: "kg" as const };
    expect(makeProductSchema(true).safeParse(porKilo).success).toBe(true);
  });
});

describe("toProductValues", () => {
  it("convierte dinero a 2 decimales y normaliza nombre/opcionales", () => {
    const result = toProductValues({
      ...baseValues,
      name: "  Alfajor   triple  ",
      wholesalePrice: "12.500,5",
      retailPrice: "",
      presentation: "  ",
    });
    expect(result.name).toBe("Alfajor triple");
    expect(result.wholesalePrice).toBe("12500.50");
    expect(result.retailPrice).toBeNull();
    expect(result.presentation).toBeNull();
  });

  it("por unidad fuerza orderMode a 'unit' y descarta el peso promedio", () => {
    const result = toProductValues({
      ...baseValues,
      pricingUnit: "unit",
      orderMode: "piece",
      avgPieceWeightKg: "4,2",
    });
    expect(result.orderMode).toBe("unit");
    expect(result.avgPieceWeightKg).toBeNull();
  });

  it("por kilo y por pieza guarda el peso con 3 decimales", () => {
    const result = toProductValues({
      ...baseValues,
      pricingUnit: "kg",
      orderMode: "piece",
      avgPieceWeightKg: "4,2",
    });
    expect(result.pricingUnit).toBe("kg");
    expect(result.orderMode).toBe("piece");
    expect(result.avgPieceWeightKg).toBe("4.200");
  });

  it("resuelve marca/categoría vacías a null y conserva las elegidas", () => {
    expect(toProductValues(baseValues).brandId).toBeNull();
    expect(toProductValues({ ...baseValues, brandId: "uuid-1" }).brandId).toBe("uuid-1");
  });
});
