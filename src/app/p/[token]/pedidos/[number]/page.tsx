import { and, eq, ne } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { resolveCustomerContext } from "@/lib/customer-access";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";

import { LinkInactive } from "../../link-inactive";
import { RepeatButton } from "./repeat-button";

function qtyLabel(quantity: string, orderMode: "unit" | "piece" | "kg"): string {
  const n = Number(quantity);
  const num = Number.isInteger(n) ? String(n) : n.toString().replace(".", ",");
  return orderMode === "kg" ? `${num} kg` : num;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ token: string; number: string }>;
}) {
  const { token, number } = await params;
  const ctx = await resolveCustomerContext(token);
  if (!ctx) return <LinkInactive />;

  const orderNumber = Number(number);

  const [order] = Number.isInteger(orderNumber)
    ? await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.customerId, ctx.customer.id),
            eq(orders.number, orderNumber),
            ne(orders.status, "draft"),
          ),
        )
        .limit(1)
    : [];

  if (!order) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-semibold">No encontramos ese pedido</h1>
        <Link href={`/p/${token}/pedidos`} className="text-primary text-sm hover:underline">
          ← Ver mis pedidos
        </Link>
      </main>
    );
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(orderItems.name);

  const discount = Number(order.discountAmount);

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="bg-background sticky top-0 z-10 flex items-center gap-2 border-b p-4">
        <Link href={`/p/${token}/pedidos`} className="text-muted-foreground text-sm hover:underline">
          ← Mis pedidos
        </Link>
        <h1 className="ml-auto text-lg font-semibold">Pedido #{order.number}</h1>
      </header>

      <div className="flex flex-col gap-1 p-4">
        <p className="text-muted-foreground text-sm">
          {order.sentAt ? formatDate(order.sentAt) : "—"} · {ORDER_STATUS_LABEL[order.status]}
        </p>
      </div>

      <ul className="divide-border divide-y border-y">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 p-4">
            <div className="flex flex-1 flex-col">
              <span className="font-medium">{it.name}</span>
              <span className="text-muted-foreground text-xs">
                {qtyLabel(it.quantity, it.orderMode)}
                {it.presentation ? ` · ${it.presentation}` : ""}
                {it.estimatedWeightKg
                  ? ` · ~${Number(it.estimatedWeightKg).toString().replace(".", ",")} kg`
                  : ""}
              </span>
            </div>
            <span className="font-medium">
              {formatMoney(it.finalLineTotal ?? it.estimatedLineTotal)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMoney(order.subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Descuento</span>
            <span>− {formatMoney(order.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold">
          <span>Total {order.finalTotal ? "" : "estimado"}</span>
          <span>{formatMoney(order.finalTotal ?? order.estimatedTotal)}</span>
        </div>
      </div>

      {order.customerNotes && (
        <div className="px-4 pb-4 text-sm">
          <span className="text-muted-foreground">Notas: </span>
          {order.customerNotes}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20">
        <div className="bg-background/95 mx-auto flex max-w-md justify-end border-t p-4 backdrop-blur">
          <RepeatButton token={token} orderNumber={order.number ?? 0} />
        </div>
      </div>
    </div>
  );
}
