import { describe, expect, it } from "vitest";

import { normalizeName, taxonomyNameSchema } from "./catalog";

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
