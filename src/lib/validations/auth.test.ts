import { describe, expect, it } from "vitest";

import { normalizeWhatsapp, registerSchema, supplierSignupSchema } from "./auth";

describe("normalizeWhatsapp", () => {
  it("deja solo dígitos", () => {
    expect(normalizeWhatsapp("+54 9 351 234-5678")).toBe("5493512345678");
    expect(normalizeWhatsapp("(0351) 15-234-5678")).toBe("0351152345678");
  });
});

describe("supplierSignupSchema", () => {
  it("normaliza el whatsapp al parsear", () => {
    const result = supplierSignupSchema.parse({
      businessName: "  Kiosco Don Pepe  ",
      whatsapp: "+54 351 234 5678",
    });
    expect(result.businessName).toBe("Kiosco Don Pepe");
    expect(result.whatsapp).toBe("543512345678");
  });

  it("rechaza whatsapp demasiado corto", () => {
    const result = supplierSignupSchema.safeParse({ businessName: "Kiosco", whatsapp: "123" });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre de comercio vacío", () => {
    const result = supplierSignupSchema.safeParse({ businessName: " ", whatsapp: "3512345678" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    businessName: "Distribuidora La Veloz",
    whatsapp: "3512345678",
    name: "José Giraudo",
    email: "Jose@Example.com ",
    password: "secret123",
  };

  it("acepta datos válidos y normaliza email a minúsculas", () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe("jose@example.com");
    expect(result.whatsapp).toBe("3512345678");
  });

  it("rechaza email inválido", () => {
    expect(registerSchema.safeParse({ ...valid, email: "no-es-email" }).success).toBe(false);
  });

  it("rechaza contraseña de menos de 8 caracteres", () => {
    expect(registerSchema.safeParse({ ...valid, password: "corta" }).success).toBe(false);
  });
});
