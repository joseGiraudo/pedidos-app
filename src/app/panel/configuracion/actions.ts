"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { getCurrentTenant } from "@/lib/session";
import { supplierConfigSchema, type SupplierConfigFormValues } from "@/lib/validations/supplier";

export type ConfigResult = { ok: true } | { error: string };

// Guarda la configuración del proveedor logueado. El supplier_id sale de la sesión,
// nunca del cliente.
export async function saveConfig(values: SupplierConfigFormValues): Promise<ConfigResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return { error: "Tu sesión expiró. Volvé a iniciar sesión." };
  }

  const parsed = supplierConfigSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Revisá los datos ingresados." };
  }

  const { name, whatsapp, useBrands, useCategories, usesOwnCodes } = parsed.data;
  await db
    .update(suppliers)
    .set({ name, whatsappPhone: whatsapp, useBrands, useCategories, usesOwnCodes })
    .where(eq(suppliers.id, tenant.supplierId));

  revalidatePath("/panel/configuracion");
  return { ok: true };
}
