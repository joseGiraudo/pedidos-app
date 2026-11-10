import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { getSession } from "@/lib/session";

import { logout } from "./actions";

// Panel del proveedor. El middleware protege la ruta (cookie); acá se valida la sesión
// contra la base como última palabra.
export default async function PanelPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const supplierId = session.user.supplierId;
  const [supplier] = supplierId
    ? await db
        .select({
          name: suppliers.name,
          useBrands: suppliers.useBrands,
          useCategories: suppliers.useCategories,
        })
        .from(suppliers)
        .where(eq(suppliers.id, supplierId))
        .limit(1)
    : [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Hola, {session.user.name}</h1>
          <p className="text-muted-foreground">
            {supplier ? `Comercio: ${supplier.name}` : "Tu comercio está listo."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/panel/articulos" />}>
            Artículos
          </Button>
          <Button variant="outline" render={<Link href="/panel/clientes" />}>
            Clientes
          </Button>
          {supplier?.useCategories && (
            <Button variant="outline" render={<Link href="/panel/categorias" />}>
              Categorías
            </Button>
          )}
          {supplier?.useBrands && (
            <Button variant="outline" render={<Link href="/panel/marcas" />}>
              Marcas
            </Button>
          )}
          <Button variant="outline" render={<Link href="/panel/configuracion" />}>
            Configuración
          </Button>
          <form action={logout}>
            <Button type="submit" variant="outline">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
