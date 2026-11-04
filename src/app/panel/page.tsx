import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { auth } from "@/lib/auth";

// Panel del proveedor. Guard básico de sesión; la protección completa (middleware,
// logout) llega en la tarea siguiente de la Etapa 1.
export default async function PanelPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/registro");
  }

  const supplierId = session.user.supplierId;
  const [supplier] = supplierId
    ? await db
        .select({ name: suppliers.name })
        .from(suppliers)
        .where(eq(suppliers.id, supplierId))
        .limit(1)
    : [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold">Hola, {session.user.name}</h1>
      <p className="text-muted-foreground">
        {supplier ? `Comercio: ${supplier.name}` : "Tu comercio está listo."}
      </p>
    </main>
  );
}
