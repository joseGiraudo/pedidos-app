import { eq } from "drizzle-orm";

import { db } from "@/db";
import { customers, suppliers } from "@/db/schema";

// Acceso del kiosquero por su link personal. A diferencia del panel, acá NO hay tenant:
// el token identifica al cliente (y, por él, a su proveedor). El token es único global y
// de 32+ caracteres; sólo se expone lo que la vista pública necesita.

export type CustomerAccess = {
  id: string;
  supplierId: string;
  businessName: string;
  priceList: "wholesale" | "retail";
  discountPct: string;
};

/**
 * Resuelve el cliente dueño del token. Devuelve `null` si el token no existe o el cliente
 * está dado de baja (link desactivado). Registra `last_seen_at` best-effort: un fallo del
 * update no rompe el acceso.
 */
export async function resolveCustomerByToken(token: string): Promise<CustomerAccess | null> {
  if (!token) return null;

  const [row] = await db
    .select({
      id: customers.id,
      supplierId: customers.supplierId,
      businessName: customers.businessName,
      priceList: customers.priceList,
      discountPct: customers.discountPct,
      isActive: customers.isActive,
    })
    .from(customers)
    .where(eq(customers.accessToken, token))
    .limit(1);

  if (!row || !row.isActive) return null;

  try {
    await db.update(customers).set({ lastSeenAt: new Date() }).where(eq(customers.id, row.id));
  } catch {
    // last_seen_at es informativo; si falla, el acceso sigue válido.
  }

  return {
    id: row.id,
    supplierId: row.supplierId,
    businessName: row.businessName,
    priceList: row.priceList,
    discountPct: row.discountPct,
  };
}

export type CustomerContext = {
  customer: CustomerAccess;
  supplier: {
    name: string;
    whatsappPhone: string | null;
    useCategories: boolean;
    useBrands: boolean;
  };
};

/**
 * Como `resolveCustomerByToken`, pero trae además los datos del proveedor que necesitan el
 * catálogo y el envío (nombre, WhatsApp, flags de marcas/categorías), en una sola consulta.
 * No registra `last_seen_at` (lo hace `resolveCustomerByToken` en la vista principal).
 */
export async function resolveCustomerContext(token: string): Promise<CustomerContext | null> {
  if (!token) return null;

  const [row] = await db
    .select({
      id: customers.id,
      supplierId: customers.supplierId,
      businessName: customers.businessName,
      priceList: customers.priceList,
      discountPct: customers.discountPct,
      isActive: customers.isActive,
      supplierName: suppliers.name,
      whatsappPhone: suppliers.whatsappPhone,
      useCategories: suppliers.useCategories,
      useBrands: suppliers.useBrands,
    })
    .from(customers)
    .innerJoin(suppliers, eq(suppliers.id, customers.supplierId))
    .where(eq(customers.accessToken, token))
    .limit(1);

  if (!row || !row.isActive) return null;

  return {
    customer: {
      id: row.id,
      supplierId: row.supplierId,
      businessName: row.businessName,
      priceList: row.priceList,
      discountPct: row.discountPct,
    },
    supplier: {
      name: row.supplierName,
      whatsappPhone: row.whatsappPhone,
      useCategories: row.useCategories,
      useBrands: row.useBrands,
    },
  };
}
