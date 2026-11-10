// Pantalla cuando el token no resuelve: link inválido o cliente dado de baja (regla de
// negocio). Sin lista ni datos. Reutilizada por todas las páginas de /p/[token].
export function LinkInactive() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-xl font-semibold">Este link ya no está activo</h1>
      <p className="text-muted-foreground">Contactá a tu proveedor para que te envíe uno nuevo.</p>
    </main>
  );
}
