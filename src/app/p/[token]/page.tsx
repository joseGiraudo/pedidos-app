import { resolveCustomerByToken } from "@/lib/customer-access";

// Vista del kiosquero (sin cuenta), identificada por el token del link personal. Acá sólo
// está el andamiaje de la Etapa 5: resolución del token, pantalla de link inactivo y
// noindex (en el layout). El catálogo y el armado del pedido son la Etapa 6.
export default async function PublicCatalogPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const customer = await resolveCustomerByToken(token);

  if (!customer) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">Este link ya no está activo</h1>
        <p className="text-muted-foreground">Contactá a tu proveedor para que te envíe uno nuevo.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold">¡Hola, {customer.businessName}!</h1>
      <p className="text-muted-foreground">
        Muy pronto vas a poder ver la lista y armar tu pedido desde acá.
      </p>
    </main>
  );
}
