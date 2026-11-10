import { describe, expect, it } from "vitest";

import { buildOrderMessage, buildOrderWhatsappUrl, type OrderMessageLine } from "./order-message";

const unitLine: OrderMessageLine = {
  quantity: "2.000",
  name: "Alfajor triple chocolate",
  presentation: "Caja x 24",
  orderMode: "unit",
  estimatedWeightKg: null,
  estimatedLineTotal: "25000.00",
};

const pieceLine: OrderMessageLine = {
  quantity: "1.000",
  name: "Queso cremoso",
  presentation: "Horma",
  orderMode: "piece",
  estimatedWeightKg: "4.200",
  estimatedLineTotal: "33600.00",
};

describe("buildOrderMessage", () => {
  const base = {
    number: 45,
    businessName: "Kiosco Don Pepe",
    date: new Date(2026, 9, 31), // 31/10/2026
    lines: [unitLine, pieceLine],
    estimatedTotal: "58600.00",
    notes: "si no hay cremoso, mandar mozzarella",
    orderLink: "https://app.com/p/abc123/pedidos/45",
  };

  it("arma el encabezado, las líneas, el total y el link", () => {
    const msg = buildOrderMessage(base);
    expect(msg).toContain("*Pedido #45 – Kiosco Don Pepe*");
    expect(msg).toContain("31/10/2026");
    expect(msg).toContain("2 × Alfajor triple chocolate (Caja x 24) —");
    expect(msg).toContain("1 × Queso cremoso (Horma, ~4,2 kg) — est.");
    expect(msg).toContain("Total estimado:");
    expect(msg).toContain("Notas: si no hay cremoso, mandar mozzarella");
    expect(msg).toContain("Ver pedido: https://app.com/p/abc123/pedidos/45");
  });

  it("omite la línea de notas si no hay", () => {
    const msg = buildOrderMessage({ ...base, notes: null });
    expect(msg).not.toContain("Notas:");
  });

  it("muestra kilos en pedidos por kg", () => {
    const msg = buildOrderMessage({
      ...base,
      lines: [
        {
          quantity: "1.500",
          name: "Jamón cocido",
          presentation: null,
          orderMode: "kg",
          estimatedWeightKg: null,
          estimatedLineTotal: "12000.00",
        },
      ],
    });
    expect(msg).toContain("1,5 kg × Jamón cocido — est.");
  });
});

describe("buildOrderWhatsappUrl", () => {
  it("arma el wa.me del proveedor con el mensaje codificado", () => {
    const url = buildOrderWhatsappUrl("5493512345678", "hola");
    expect(url).toBe("https://wa.me/5493512345678?text=hola");
  });

  it("devuelve null sin teléfono válido", () => {
    expect(buildOrderWhatsappUrl(null, "hola")).toBeNull();
    expect(buildOrderWhatsappUrl("123", "hola")).toBeNull();
  });
});
