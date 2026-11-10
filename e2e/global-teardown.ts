import { eq, inArray, like } from "drizzle-orm";

// Borra los datos que dejan los tests e2e (usuarios e2e-*@example.com, sus suppliers y todos
// los datos de negocio asociados: pedidos, artículos, clientes, marcas y categorías).
export default async function globalTeardown() {
  const { db } = await import("../src/db");
  // Import directo de los archivos (el barrel con `export *` no resuelve bien en el runner).
  const { user, account, session, verification } = await import("../src/db/schema/auth");
  const { suppliers } = await import("../src/db/schema/suppliers");
  const { orders } = await import("../src/db/schema/orders");
  const { orderItems } = await import("../src/db/schema/order-items");
  const { orderEvents } = await import("../src/db/schema/order-events");
  const { products } = await import("../src/db/schema/products");
  const { customers } = await import("../src/db/schema/customers");
  const { brands } = await import("../src/db/schema/brands");
  const { categories } = await import("../src/db/schema/categories");
  const { priceChanges } = await import("../src/db/schema/price-changes");
  const { priceUpdateBatches } = await import("../src/db/schema/price-update-batches");

  const users = await db
    .select({ id: user.id, supplierId: user.supplierId })
    .from(user)
    .where(like(user.email, "e2e-%@example.com"));

  for (const u of users) {
    await db.delete(verification).where(eq(verification.value, u.id));
    await db.delete(session).where(eq(session.userId, u.id));
    await db.delete(account).where(eq(account.userId, u.id));
    await db.delete(user).where(eq(user.id, u.id));

    if (!u.supplierId) continue;
    const sid = u.supplierId;

    // Datos de negocio, en orden de FKs (hijos primero).
    const ords = await db.select({ id: orders.id }).from(orders).where(eq(orders.supplierId, sid));
    const orderIds = ords.map((o) => o.id);
    if (orderIds.length > 0) {
      await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    }
    await db.delete(orderEvents).where(eq(orderEvents.supplierId, sid));
    await db.delete(orders).where(eq(orders.supplierId, sid));

    const prods = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.supplierId, sid));
    const productIds = prods.map((p) => p.id);
    if (productIds.length > 0) {
      await db.delete(priceChanges).where(inArray(priceChanges.productId, productIds));
    }
    await db.delete(priceUpdateBatches).where(eq(priceUpdateBatches.supplierId, sid));
    await db.delete(products).where(eq(products.supplierId, sid));
    await db.delete(customers).where(eq(customers.supplierId, sid));
    await db.delete(brands).where(eq(brands.supplierId, sid));
    await db.delete(categories).where(eq(categories.supplierId, sid));

    await db.delete(suppliers).where(eq(suppliers.id, sid));
  }

  if (users.length > 0) {
    console.log(`[e2e teardown] eliminados ${users.length} usuarios de prueba`);
  }
}
