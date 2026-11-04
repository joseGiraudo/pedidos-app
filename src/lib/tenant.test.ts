import { describe, expect, it } from "vitest";

import { products } from "@/db/schema";

import { assertOwned, tenantEq, TenantAccessError, withTenant, type Tenant } from "./tenant";

const tenant: Tenant = { supplierId: "sup-1" };

describe("withTenant", () => {
  it("estampa el supplierId y preserva el resto de campos", () => {
    const result = withTenant({ name: "Alfajor", code: "ALF-1" }, tenant);
    expect(result).toEqual({ name: "Alfajor", code: "ALF-1", supplierId: "sup-1" });
  });

  it("pisa un supplierId previo con el del tenant", () => {
    const result = withTenant({ name: "Alfajor", supplierId: "otro" }, tenant);
    expect(result.supplierId).toBe("sup-1");
  });
});

describe("assertOwned", () => {
  it("devuelve la fila cuando pertenece al tenant", () => {
    const row = { id: "p1", supplierId: "sup-1" };
    expect(assertOwned(row, tenant)).toBe(row);
  });

  it("lanza cuando la fila es null o undefined", () => {
    expect(() => assertOwned(null, tenant)).toThrow(TenantAccessError);
    expect(() => assertOwned(undefined, tenant)).toThrow(TenantAccessError);
  });

  it("lanza cuando el supplierId no coincide", () => {
    expect(() => assertOwned({ id: "p1", supplierId: "otro" }, tenant)).toThrow(TenantAccessError);
  });
});

describe("tenantEq", () => {
  it("devuelve una condición SQL para una tabla con supplier_id", () => {
    expect(tenantEq(products, tenant)).toBeDefined();
  });
});
