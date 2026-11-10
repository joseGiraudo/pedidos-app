import { describe, expect, it } from "vitest";

import {
  computeLine,
  computeOrderTotals,
  selectListPriceCents,
  type LineResult,
} from "./order-pricing";

describe("selectListPriceCents", () => {
  const product = { wholesalePrice: "100.00", retailPrice: "130.00" };

  it("usa el mayorista para la lista wholesale", () => {
    expect(selectListPriceCents(product, "wholesale")).toBe(10000);
  });

  it("usa el minorista para la lista retail", () => {
    expect(selectListPriceCents(product, "retail")).toBe(13000);
  });

  it("si el minorista es NULL, usa el mayorista aun en lista retail", () => {
    expect(selectListPriceCents({ wholesalePrice: "100.00", retailPrice: null }, "retail")).toBe(
      10000,
    );
  });
});

describe("computeLine", () => {
  it("por unidad: total = precio × cantidad", () => {
    const line = computeLine({
      listPriceCents: 10000,
      discountPct: 0,
      quantity: 3,
      orderMode: "unit",
      avgPieceWeightKg: null,
    });
    expect(line.unitPriceCents).toBe(10000);
    expect(line.estimatedWeightKg).toBeNull();
    expect(line.estimatedLineTotalCents).toBe(30000);
    expect(line.grossLineTotalCents).toBe(30000);
  });

  it("aplica el descuento del cliente al precio, sin redondear a pesos", () => {
    const line = computeLine({
      listPriceCents: 10000,
      discountPct: 10,
      quantity: 2,
      orderMode: "unit",
      avgPieceWeightKg: null,
    });
    expect(line.unitPriceCents).toBe(9000);
    expect(line.estimatedLineTotalCents).toBe(18000);
    expect(line.grossLineTotalCents).toBe(20000);
  });

  it("por kilo: total = precio/kg × kilos", () => {
    const line = computeLine({
      listPriceCents: 500000,
      discountPct: 0,
      quantity: 1.5,
      orderMode: "kg",
      avgPieceWeightKg: null,
    });
    expect(line.estimatedLineTotalCents).toBe(750000);
  });

  it("por pieza: peso estimado = piezas × peso promedio, total = precio/kg × peso", () => {
    const line = computeLine({
      listPriceCents: 800000, // $8000/kg
      discountPct: 0,
      quantity: 2,
      orderMode: "piece",
      avgPieceWeightKg: 4.2,
    });
    expect(line.estimatedWeightKg).toBe(8.4);
    expect(line.estimatedLineTotalCents).toBe(6720000); // 8000 × 8.4 = 67.200
  });
});

describe("computeOrderTotals", () => {
  it("suma bruto y neto; el descuento es la diferencia", () => {
    const lines: LineResult[] = [
      computeLine({ listPriceCents: 10000, discountPct: 10, quantity: 2, orderMode: "unit", avgPieceWeightKg: null }),
      computeLine({ listPriceCents: 5000, discountPct: 10, quantity: 1, orderMode: "unit", avgPieceWeightKg: null }),
    ];
    const totals = computeOrderTotals(lines);
    expect(totals.subtotalCents).toBe(25000);
    expect(totals.estimatedTotalCents).toBe(22500);
    expect(totals.discountAmountCents).toBe(2500);
  });
});
