import { eq, like } from "drizzle-orm";

// Borra los datos que dejan los tests e2e (usuarios e2e-*@example.com y sus suppliers).
export default async function globalTeardown() {
  const { db } = await import("../src/db");
  // Import directo de los archivos (el barrel con `export *` no resuelve bien en el runner).
  const { user, account, session, verification } = await import("../src/db/schema/auth");
  const { suppliers } = await import("../src/db/schema/suppliers");

  const users = await db
    .select({ id: user.id, supplierId: user.supplierId })
    .from(user)
    .where(like(user.email, "e2e-%@example.com"));

  for (const u of users) {
    await db.delete(verification).where(eq(verification.value, u.id));
    await db.delete(session).where(eq(session.userId, u.id));
    await db.delete(account).where(eq(account.userId, u.id));
    await db.delete(user).where(eq(user.id, u.id));
    if (u.supplierId) {
      await db.delete(suppliers).where(eq(suppliers.id, u.supplierId));
    }
  }

  if (users.length > 0) {
    console.log(`[e2e teardown] eliminados ${users.length} usuarios de prueba`);
  }
}
