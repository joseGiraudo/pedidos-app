import { headers } from "next/headers";

import { auth } from "./auth";
import type { Tenant } from "./tenant";

// Acceso a la sesión de Better Auth desde el servidor (Server Components y actions).

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Tenant del proveedor logueado, o null si no hay sesión. */
export async function getCurrentTenant(): Promise<Tenant | null> {
  const session = await getSession();
  const supplierId = session?.user.supplierId;
  return supplierId ? { supplierId } : null;
}
