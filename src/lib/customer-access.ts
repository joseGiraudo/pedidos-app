import { eq } from "drizzle-orm";

import { db } from "@/db";
import { customers } from "@/db/schema";

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
