import { describe, expect, it } from "vitest";

import { autoDetectMapping } from "./mapping";
import { buildPreview, type ExistingProduct, type ImportMode } from "./preview";

const HEADERS = [
  "codigo",
  "nombre",
  "marca",
  "categoria",
  "presentacion",
  "tipo_precio",
  "forma_pedido",
  "peso_promedio_kg",
  "precio_mayorista",
  "precio_minorista",
  "disponible",
];

/** Arma una fila alineada a HEADERS desde un objeto por nombre de columna. */
function row(values: Record<string, string>): string[] {
  return HEADERS.map((h) => values[h] ?? "");
}

function existing(partial: Partial<ExistingProduct> & { id: string; code: string }): ExistingProduct {
  return {
    name: "",
    presentation: null,
    codeIsGenerated: false,
    ...partial,
  };
}

function preview(
  rows: string[][],
  opts: {
    existing?: ExistingProduct[];
    mode?: ImportMode;
    usesOwnCodes?: boolean;
    headers?: string[];
  } = {},
) {
  const headers = opts.headers ?? HEADERS;
  return buildPreview({
    headers,
    rows,
    mapping: autoDetectMapping(headers),
    mode: opts.mode ?? "upsert",
    existing: opts.existing ?? [],
    usesOwnCodes: opts.usesOwnCodes ?? false,
  });
}

describe("buildPreview", () => {
  it("clasifica un código nuevo como crear", () => {
    const p = preview([row({ codigo: "ALF-1", nombre: "Alfajor", precio_mayorista: "1000,00" })]);
    expect(p.rows[0].status).toBe("create");
    expect(p.summary.create).toBe(1);
  });

  it("clasifica un código existente como actualizar", () => {
    const p = preview([row({ codigo: "ALF-1", nombre: "Alfajor", precio_mayorista: "1200,00" })], {
      existing: [existing({ id: "a", code: "ALF-1", name: "Alfajor" })],
    });
    expect(p.rows[0].status).toBe("update");
    expect(p.rows[0].matchId).toBe("a");
  });

  it("marca como error los códigos repetidos en la planilla", () => {
    const p = preview([
      row({ codigo: "X1", nombre: "Uno", precio_mayorista: "100,00" }),
      row({ codigo: "X1", nombre: "Dos", precio_mayorista: "200,00" }),
    ]);
    expect(p.rows.every((r) => r.status === "error")).toBe(true);
    expect(p.rows[0].errors.join()).toMatch(/repetido/i);
  });

  it("un artículo nuevo sin precio mayorista es error", () => {
    const p = preview([row({ codigo: "N1", nombre: "Sin precio" })]);
    expect(p.rows[0].status).toBe("error");
    expect(p.rows[0].errors.join()).toMatch(/precio mayorista/i);
  });

  it("un artículo nuevo sin nombre es error", () => {
    const p = preview([row({ codigo: "N2", precio_mayorista: "100,00" })]);
    expect(p.rows[0].status).toBe("error");
    expect(p.rows[0].errors.join()).toMatch(/nombre/i);
  });

  it("un precio inválido es error", () => {
    const p = preview([row({ codigo: "N3", nombre: "Raro", precio_mayorista: "abc" })]);
    expect(p.rows[0].status).toBe("error");
  });

  it("preserva los ceros a la izquierda al cruzar por código", () => {
    const ex = [existing({ id: "z", code: "007", name: "Caramelo" })];
    const match = preview([row({ codigo: "007", nombre: "Caramelo", precio_mayorista: "50,00" })], {
      existing: ex,
    });
    expect(match.rows[0].status).toBe("update");

    const noMatch = preview([row({ codigo: "7", nombre: "Caramelo", precio_mayorista: "50,00" })], {
      existing: ex,
    });
    expect(noMatch.rows[0].status).toBe("possible_duplicate");
  });

  it("cruza por nombre+presentación cuando no hay columna de código", () => {
    const headers = ["nombre", "presentacion", "precio_mayorista"];
    const p = preview([["Agua", "Botella 500ml", "300,00"]], {
      headers,
      existing: [existing({ id: "w", code: "GEN-1", name: "agua", presentation: "botella 500ml" })],
    });
    expect(p.rows[0].status).toBe("update");
    expect(p.rows[0].matchId).toBe("w");
  });

  it("marca posible duplicado: código nuevo con mismo nombre+presentación", () => {
    const p = preview(
      [row({ codigo: "NUEVO", nombre: "Agua", presentacion: "Botella", precio_mayorista: "300,00" })],
      { existing: [existing({ id: "w", code: "VIEJO", name: "Agua", presentation: "Botella" })] },
    );
    expect(p.rows[0].status).toBe("possible_duplicate");
    expect(p.summary.possibleDuplicate).toBe(1);
  });

  it("modo 'solo agregar' omite los existentes", () => {
    const p = preview([row({ codigo: "A", nombre: "Uno", precio_mayorista: "100,00" })], {
      existing: [existing({ id: "a", code: "A", name: "Uno" })],
      mode: "add_only",
    });
    expect(p.rows[0].status).toBe("skip");
  });

  it("modo 'solo precios' omite los nuevos", () => {
    const p = preview([row({ codigo: "NEW", nombre: "Nuevo", precio_mayorista: "100,00" })], {
      mode: "update_prices_only",
    });
    expect(p.rows[0].status).toBe("skip");
  });

  it("cuenta los artículos ausentes de la planilla", () => {
    const p = preview([row({ codigo: "A", nombre: "Uno", precio_mayorista: "100,00" })], {
      existing: [
        existing({ id: "a", code: "A", name: "Uno" }),
        existing({ id: "b", code: "B", name: "Dos" }),
      ],
    });
    expect(p.summary.missing).toBe(1);
  });

  it("exige código cuando el proveedor usa códigos propios", () => {
    const p = preview([row({ nombre: "Sin código", precio_mayorista: "100,00" })], {
      usesOwnCodes: true,
    });
    expect(p.rows[0].status).toBe("error");
    expect(p.rows[0].errors.join()).toMatch(/código/i);
  });

  it("por kilo pedido por pieza exige peso promedio", () => {
    const p = preview([
      row({
        codigo: "K1",
        nombre: "Queso",
        precio_mayorista: "1000,00",
        tipo_precio: "kg",
        forma_pedido: "pieza",
      }),
    ]);
    expect(p.rows[0].status).toBe("error");
    expect(p.rows[0].errors.join()).toMatch(/peso/i);
  });
});
