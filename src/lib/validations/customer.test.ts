import { describe, expect, it } from "vitest";

import { customerSchema, toCustomerValues, type CustomerFormValues } from "./customer";

const base: CustomerFormValues = {
  businessName: "Kiosco Don Pepe",
  contactName: "",
  phone: "",
  address: "",
  notes: "",
  priceList: "wholesale",
  discountPct: "",
};

describe("customerSchema", () => {
  it("acepta el mínimo (solo nombre del negocio)", () => {
    expect(customerSchema.safeParse(base).success).toBe(true);
  });

  it("exige el nombre del negocio", () => {
    expect(customerSchema.safeParse({ ...base, businessName: " " }).success).toBe(false);
    expect(customerSchema.safeParse({ ...base, businessName: "a" }).success).toBe(false);
  });

  it("acepta teléfono con formato variado y rechaza números imposibles", () => {
    expect(customerSchema.safeParse({ ...base, phone: "+54 9 351 234-5678" }).success).toBe(true);
    expect(customerSchema.safeParse({ ...base, phone: "123" }).success).toBe(false);
  });

  it("valida el rango del descuento", () => {
    expect(customerSchema.safeParse({ ...base, discountPct: "12,5" }).success).toBe(true);
    expect(customerSchema.safeParse({ ...base, discountPct: "0" }).success).toBe(true);
    expect(customerSchema.safeParse({ ...base, discountPct: "100" }).success).toBe(true);
    expect(customerSchema.safeParse({ ...base, discountPct: "101" }).success).toBe(false);
    expect(customerSchema.safeParse({ ...base, discountPct: "-1" }).success).toBe(false);
    expect(customerSchema.safeParse({ ...base, discountPct: "abc" }).success).toBe(false);
  });
});

describe("toCustomerValues", () => {
  it("normaliza nombre, deja opcionales vacíos en null y descuento vacío en 0", () => {
    const values = toCustomerValues(customerSchema.parse(base));
    expect(values.businessName).toBe("Kiosco Don Pepe");
    expect(values.contactName).toBeNull();
    expect(values.phone).toBeNull();
    expect(values.address).toBeNull();
    expect(values.notes).toBeNull();
    expect(values.priceList).toBe("wholesale");
    expect(values.discountPct).toBe("0.00");
  });

  it("normaliza el teléfono a solo dígitos y convierte el descuento con coma", () => {
    const values = toCustomerValues(
      customerSchema.parse({
        ...base,
        contactName: "  Pepe   Gómez ",
        phone: "+54 9 351 234-5678",
        discountPct: "12,5",
        priceList: "retail",
      }),
    );
    expect(values.contactName).toBe("Pepe Gómez");
    expect(values.phone).toBe("5493512345678");
    expect(values.discountPct).toBe("12.50");
    expect(values.priceList).toBe("retail");
  });
});
