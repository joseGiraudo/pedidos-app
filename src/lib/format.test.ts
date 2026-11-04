import { describe, expect, it } from "vitest";

import { formatMoney } from "./format";

// Se normalizan los espacios (Intl usa espacios finos/no-rompibles) para no atar el
// test al carácter exacto de separación.
const flat = (s: string) => s.replace(/\s/g, "");

describe("formatMoney", () => {
  it("formatea con separador de miles (punto) y decimales (coma)", () => {
    expect(flat(formatMoney("12500.00"))).toBe("$12.500,00");
    expect(flat(formatMoney("1234567.5"))).toBe("$1.234.567,50");
  });

  it("acepta número y string", () => {
    expect(flat(formatMoney(0))).toBe("$0,00");
    expect(flat(formatMoney("99.9"))).toBe("$99,90");
  });

  it("devuelve guión para valores inválidos", () => {
    expect(formatMoney("")).toBe("—");
    expect(formatMoney("abc")).toBe("—");
  });
});
