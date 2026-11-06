import { describe, expect, it } from "vitest";

import {
  applyPercentage,
  computeNewPriceCents,
  computeProductChange,
  fromCents,
  roundToMultiple,
  toCents,
} from "./pricing";

describe("toCents / fromCents", () => {
  it("convierte ida y vuelta sin perder centavos", () => {
    expect(toCents("12500.00")).toBe(1250000);
    expect(toCents("99.90")).toBe(9990);
    expect(toCents("0.05")).toBe(5);
    expect(fromCents(1250000)).toBe("12500.00");
    expect(fromCents(9990)).toBe("99.90");
    expect(fromCents(5)).toBe("0.05");
  });

  it("acepta número y lanza en montos inválidos", () => {
    expect(toCents(123.45)).toBe(12345);
    expect(() => toCents("abc")).toThrow(RangeError);
  });
});

describe("applyPercentage", () => {
  it("aumenta y rebaja", () => {
    expect(applyPercentage(100000, 10)).toBe(110000); // +10%
    expect(applyPercentage(100000, -5)).toBe(95000); // -5%
    expect(applyPercentage(100000, 0)).toBe(100000); // sin cambio
  });

  it("no arrastra errores de float (opera en centavos)", () => {
    // 1999.99 * 1.08 = 2159.9892 → se redondea al centavo
    expect(fromCents(applyPercentage(toCents("1999.99"), 8))).toBe("2159.99");
  });
});

describe("roundToMultiple", () => {
  it("redondea hacia arriba al próximo múltiplo (en pesos)", () => {
    expect(fromCents(roundToMultiple(toCents("1201.00"), 50, "up"))).toBe("1250.00");
    expect(fromCents(roundToMultiple(toCents("1250.00"), 50, "up"))).toBe("1250.00");
    expect(fromCents(roundToMultiple(toCents("1243.00"), 10, "up"))).toBe("1250.00");
  });

  it("redondea al más cercano", () => {
    expect(fromCents(roundToMultiple(toCents("1201.00"), 50, "nearest"))).toBe("1200.00");
    expect(fromCents(roundToMultiple(toCents("1243.00"), 50, "nearest"))).toBe("1250.00");
    expect(fromCents(roundToMultiple(toCents("1276.00"), 50, "nearest"))).toBe("1300.00");
    expect(fromCents(roundToMultiple(toCents("1234.00"), 100, "nearest"))).toBe("1200.00");
  });

  it("sin redondeo cuando el múltiplo es 0 o negativo", () => {
    expect(roundToMultiple(123499, 0, "up")).toBe(123499);
    expect(roundToMultiple(123499, -1, "nearest")).toBe(123499);
  });

  it("bordes: precio menor al múltiplo", () => {
    // $7 con múltiplo de $50
    expect(fromCents(roundToMultiple(toCents("7.00"), 50, "up"))).toBe("50.00");
    expect(fromCents(roundToMultiple(toCents("7.00"), 50, "nearest"))).toBe("0.00");
  });
});

describe("computeNewPriceCents", () => {
  it("compone porcentaje + redondeo", () => {
    // $1000 +8% = $1080 → redondeo al $50 hacia arriba = $1100
    expect(fromCents(computeNewPriceCents(toCents("1000.00"), 8, 50, "up"))).toBe("1100.00");
    // $1000 +8% = $1080 → al más cercano al $50 = $1100
    expect(fromCents(computeNewPriceCents(toCents("1000.00"), 8, 50, "nearest"))).toBe(
      "1100.00",
    );
    // sin redondeo deja el valor exacto
    expect(fromCents(computeNewPriceCents(toCents("1000.00"), 8, 0, "up"))).toBe("1080.00");
  });
});

describe("computeProductChange", () => {
  const params = { percentage: 10, multiple: 0, mode: "up" as const, target: "both" as const };

  it("aplica a mayorista y minorista según el target", () => {
    const change = computeProductChange(
      { wholesale: "1000.00", retail: "1200.00" },
      params,
    );
    expect(change).toEqual({
      oldWholesale: "1000.00",
      newWholesale: "1100.00",
      oldRetail: "1200.00",
      newRetail: "1320.00",
    });
  });

  it("no toca el minorista si el target es solo mayorista", () => {
    const change = computeProductChange(
      { wholesale: "1000.00", retail: "1200.00" },
      { ...params, target: "wholesale" },
    );
    expect(change.newWholesale).toBe("1100.00");
    expect(change.newRetail).toBe("1200.00"); // sin cambios
  });

  it("no toca el mayorista si el target es solo minorista", () => {
    const change = computeProductChange(
      { wholesale: "1000.00", retail: "1200.00" },
      { ...params, target: "retail" },
    );
    expect(change.newWholesale).toBe("1000.00"); // sin cambios
    expect(change.newRetail).toBe("1320.00");
  });

  it("deja el minorista NULL en NULL (hereda del mayorista)", () => {
    const change = computeProductChange({ wholesale: "1000.00", retail: null }, params);
    expect(change.newWholesale).toBe("1100.00");
    expect(change.oldRetail).toBeNull();
    expect(change.newRetail).toBeNull();
  });
});
