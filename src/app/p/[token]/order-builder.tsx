"use client";

import { MinusIcon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { computeLine } from "@/lib/order-pricing";
import { fromCents } from "@/lib/pricing";
import { parseArgNumber } from "@/lib/validations/catalog";

import { setDraftItem } from "./actions";

export type CatalogProduct = {
  id: string;
  code: string;
  name: string;
  presentation: string | null;
  categoryName: string | null;
  orderMode: "unit" | "piece" | "kg";
  pricingUnit: "unit" | "kg";
  avgPieceWeightKg: number | null;
  isAvailable: boolean;
  listPriceCents: number;
};

type OrderBuilderProps = {
  token: string;
  businessName: string;
  supplierName: string;
  discountPct: number;
  products: CatalogProduct[];
  initialQuantities: Record<string, string>;
  query: string;
};

const UNCATEGORIZED = "Sin categoría";

export function OrderBuilder({
  token,
  businessName,
  supplierName,
  discountPct,
  products,
  initialQuantities,
  query,
}: OrderBuilderProps) {
  const [isPending, startTransition] = useTransition();
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const [id, q] of Object.entries(initialQuantities)) init[id] = Number(q);
    return init;
  });

  function lineCents(p: CatalogProduct, qty: number): number {
    return computeLine({
      listPriceCents: p.listPriceCents,
      discountPct,
      quantity: qty,
      orderMode: p.orderMode,
      avgPieceWeightKg: p.avgPieceWeightKg,
    }).estimatedLineTotalCents;
  }

  function unitPriceCents(p: CatalogProduct): number {
    return computeLine({
      listPriceCents: p.listPriceCents,
      discountPct,
      quantity: 0,
      orderMode: p.orderMode,
      avgPieceWeightKg: p.avgPieceWeightKg,
    }).unitPriceCents;
  }

  function setQuantity(p: CatalogProduct, next: number) {
    const qty = Math.max(0, Math.round(next * 1000) / 1000);
    const prev = quantities[p.id] ?? 0;
    if (qty === prev) return;

    setQuantities((s) => ({ ...s, [p.id]: qty }));
    startTransition(async () => {
      const result = await setDraftItem(token, p.id, qty);
      if ("error" in result) {
        setQuantities((s) => ({ ...s, [p.id]: prev })); // revertir
        toast.error(result.error);
      }
    });
  }

  // Agrupar por categoría preservando el orden recibido (ya viene ordenado).
  const groups = new Map<string, CatalogProduct[]>();
  for (const p of products) {
    const key = p.categoryName ?? UNCATEGORIZED;
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }

  const itemCount = Object.values(quantities).filter((q) => q > 0).length;
  const totalCents = products.reduce((s, p) => s + lineCents(p, quantities[p.id] ?? 0), 0);

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="bg-background sticky top-0 z-10 flex flex-col gap-3 border-b p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">{supplierName}</h1>
            <p className="text-muted-foreground text-sm">Hola, {businessName}. Armá tu pedido.</p>
          </div>
          <Link href={`/p/${token}/pedidos`} className="text-primary text-sm hover:underline">
            Mis pedidos
          </Link>
        </div>
        <form method="get" className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Buscar por nombre o código…"
              className="h-9 pl-8"
            />
          </div>
          <Button type="submit" variant="outline" size="lg">
            Buscar
          </Button>
        </form>
      </header>

      {products.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">
          {query ? "No encontramos artículos con esa búsqueda." : "Todavía no hay artículos en la lista."}
        </p>
      ) : (
        <div className="flex flex-col gap-6 p-4">
          {[...groups.entries()].map(([category, items]) => (
            <section key={category} className="flex flex-col gap-2">
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {category}
              </h2>
              <ul className="divide-border divide-y rounded-lg border">
                {items.map((p) => {
                  const qty = quantities[p.id] ?? 0;
                  const perUnit = formatMoney(fromCents(unitPriceCents(p)));
                  return (
                    <li key={p.id} className="flex items-center gap-3 p-3">
                      <div className="flex flex-1 flex-col">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {p.presentation ? `${p.presentation} · ` : ""}
                          {perUnit}
                          {p.pricingUnit === "kg" ? " /kg" : ""}
                        </span>
                        {!p.isAvailable && (
                          <span className="text-destructive text-xs">Sin stock</span>
                        )}
                      </div>
                      {p.isAvailable ? (
                        <QtyControl product={p} qty={qty} disabled={isPending} onChange={setQuantity} />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20">
          <div className="bg-background/95 mx-auto flex max-w-md items-center justify-between gap-3 border-t p-4 backdrop-blur">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">
                {itemCount} {itemCount === 1 ? "artículo" : "artículos"} · estimado
              </span>
              <span className="text-lg font-semibold">{formatMoney(fromCents(totalCents))}</span>
            </div>
            <Button size="lg" render={<Link href={`/p/${token}/revisar`} />}>
              Revisar pedido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type QtyControlProps = {
  product: CatalogProduct;
  qty: number;
  disabled: boolean;
  onChange: (product: CatalogProduct, next: number) => void;
};

function QtyControl({ product, qty, disabled, onChange }: QtyControlProps) {
  const step = product.orderMode === "kg" ? 0.5 : 1;
  const [editing, setEditing] = useState<string | null>(null);

  // Mostrar enteros sin decimales; kg con coma.
  const display = Number.isInteger(qty) ? String(qty) : qty.toString().replace(".", ",");

  if (qty === 0) {
    return (
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => onChange(product, step)}>
        <PlusIcon />
        Agregar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon-sm"
        variant="outline"
        aria-label="Quitar uno"
        disabled={disabled}
        onClick={() => onChange(product, qty - step)}
      >
        <MinusIcon />
      </Button>
      <Input
        inputMode={product.orderMode === "kg" ? "decimal" : "numeric"}
        aria-label={`Cantidad de ${product.name}`}
        className="h-8 w-14 text-center"
        value={editing ?? display}
        onChange={(e) => setEditing(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => {
          if (editing !== null) {
            const parsed = parseArgNumber(editing);
            if (parsed !== null) onChange(product, parsed);
            setEditing(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <Button
        size="icon-sm"
        variant="outline"
        aria-label="Agregar uno"
        disabled={disabled}
        onClick={() => onChange(product, qty + step)}
      >
        <PlusIcon />
      </Button>
    </div>
  );
}
