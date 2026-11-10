import { and, desc, eq, ne } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db";
import { orders } from "@/db/schema";
import { resolveCustomerContext } from "@/lib/customer-access";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";

import { LinkInactive } from "../link-inactive";

export default async function OrdersHistoryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await resolveCustomerContext(token);
  if (!ctx) return <LinkInactive />;

  const rows = await db
    .select({
      number: orders.number,
      status: orders.status,
      estimatedTotal: orders.estimatedTotal,
      finalTotal: orders.finalTotal,
      sentAt: orders.sentAt,
    })
    .from(orders)
    .where(and(eq(orders.customerId, ctx.customer.id), ne(orders.status, "draft")))
    .orderBy(desc(orders.number));

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-background sticky top-0 z-10 flex items-center gap-2 border-b p-4">
        <Link href={`/p/${token}`} className="text-muted-foreground text-sm hover:underline">
          ← Volver a la lista
        </Link>
        <h1 className="ml-auto text-lg font-semibold">Mis pedidos</h1>
      </header>

      {rows.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">Todavía no enviaste pedidos.</p>
      ) : (
        <ul className="divide-border divide-y border-b">
          {rows.map((o) => (
            <li key={o.number}>
              <Link
                href={`/p/${token}/pedidos/${o.number}`}
                className="hover:bg-muted/50 flex items-center gap-3 p-4"
              >
                <div className="flex flex-1 flex-col">
                  <span className="font-medium">Pedido #{o.number}</span>
                  <span className="text-muted-foreground text-xs">
                    {o.sentAt ? formatDate(o.sentAt) : "—"} · {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </div>
                <span className="font-medium">{formatMoney(o.finalTotal ?? o.estimatedTotal)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
