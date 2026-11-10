import { and, asc, count, eq, ilike } from "drizzle-orm";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { getCurrentTenant } from "@/lib/session";
import { tenantEq } from "@/lib/tenant";

import { CustomerRowActions } from "./customer-row-actions";

export const metadata: Metadata = {
  title: "Clientes",
};

type SearchParams = Record<string, string | string[] | undefined>;

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

type StatusFilter = "active" | "inactive" | "all";

function readStatus(value: string): StatusFilter {
  return value === "inactive" || value === "all" ? value : "active";
}

const PRICE_LIST_LABEL = { wholesale: "Mayorista", retail: "Minorista" } as const;

/** "12.50" → "12,5 %"; 0 → "—". */
function formatDiscount(pct: string): string {
  const n = Number(pct);
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })} %`;
}

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-lg border bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:ring-3 dark:bg-input/30";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    redirect("/login");
  }

  const sp = await searchParams;
  const q = str(sp.q).trim();
  const status = readStatus(str(sp.status));

  const conditions = [tenantEq(customers, tenant)];
  if (q) conditions.push(ilike(customers.businessName, `%${q}%`));
  if (status !== "all") conditions.push(eq(customers.isActive, status === "active"));
  const where = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(customers).where(where);

  const rows = await db
    .select({
      id: customers.id,
      businessName: customers.businessName,
      contactName: customers.contactName,
      phone: customers.phone,
      priceList: customers.priceList,
      discountPct: customers.discountPct,
      isActive: customers.isActive,
    })
    .from(customers)
    .where(where)
    .orderBy(asc(customers.businessName));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-8">
      <Link href="/panel" className="text-muted-foreground text-sm hover:underline">
        ← Volver al panel
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            {total} {total === 1 ? "cliente" : "clientes"}
          </p>
        </div>
        <Link href="/panel/clientes/nuevo" className={cn(buttonVariants({ size: "lg" }))}>
          <PlusIcon />
          Agregar cliente
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre del negocio…"
          className="h-9 max-w-xs flex-1"
        />
        <select name="status" defaultValue={status} className={selectClass} aria-label="Estado">
          <option value="active">Activos</option>
          <option value="inactive">Dados de baja</option>
          <option value="all">Todos</option>
        </select>
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
          Filtrar
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {q || status !== "active"
            ? "No hay clientes que coincidan con el filtro."
            : "Todavía no tenés clientes. Agregá el primero para compartirle su link."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="p-3 font-medium">Negocio</th>
                <th className="p-3 font-medium">Contacto</th>
                <th className="p-3 font-medium">Lista</th>
                <th className="p-3 font-medium">Descuento</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((c) => (
                <tr key={c.id} className={cn(!c.isActive && "opacity-60")}>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{c.businessName}</span>
                      {!c.isActive && (
                        <span className="text-muted-foreground text-xs">Dado de baja</span>
                      )}
                    </div>
                  </td>
                  <td className="text-muted-foreground p-3">
                    {c.contactName || c.phone || "—"}
                    {c.contactName && c.phone && (
                      <span className="block text-xs">{c.phone}</span>
                    )}
                  </td>
                  <td className="p-3">{PRICE_LIST_LABEL[c.priceList]}</td>
                  <td className="p-3">{formatDiscount(c.discountPct)}</td>
                  <td className="p-3">
                    <CustomerRowActions
                      id={c.id}
                      businessName={c.businessName}
                      isActive={c.isActive}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
