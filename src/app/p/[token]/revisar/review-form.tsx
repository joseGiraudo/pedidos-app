"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { DraftView } from "@/lib/order-draft";

import { sendOrder, setDraftItem } from "../actions";

function qtyLabel(quantity: string, orderMode: "unit" | "piece" | "kg"): string {
  const n = Number(quantity);
  const num = Number.isInteger(n) ? String(n) : n.toString().replace(".", ",");
  return orderMode === "kg" ? `${num} kg` : num;
}

export function ReviewForm({ token, draft }: { token: string; draft: DraftView }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function remove(productId: string) {
    startTransition(async () => {
      const result = await setDraftItem(token, productId, 0);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function send() {
    startTransition(async () => {
      const result = await sendOrder(token, notes);
      if ("error" in result) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      toast.success(`Pedido #${result.number} enviado.`);
      // Navegar primero; abrir WhatsApp no debe bloquear la navegación si el popup falla.
      router.push(`/p/${token}/pedidos/${result.number}`);
      router.refresh();
      if (result.whatsappUrl) {
        try {
          window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
        } catch {
          // El pedido ya quedó guardado aunque no se pueda abrir WhatsApp.
        }
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col pb-28">
      <header className="bg-background sticky top-0 z-10 flex items-center gap-2 border-b p-4">
        <Link href={`/p/${token}`} className="text-muted-foreground text-sm hover:underline">
          ← Seguir agregando
        </Link>
        <h1 className="ml-auto text-lg font-semibold">Revisá tu pedido</h1>
      </header>

      {draft.hasBlocked && (
        <div className="bg-destructive/10 text-destructive m-4 rounded-lg p-3 text-sm">
          Hay artículos que ya no están disponibles. Quitalos para poder enviar el pedido.
        </div>
      )}

      {draft.hasPriceChange && (
        <div className="bg-muted mx-4 mt-4 rounded-lg p-3 text-sm">
          Algunos precios cambiaron desde que los agregaste. El total ya está actualizado con los
          precios vigentes.
        </div>
      )}

      <ul className="divide-border divide-y border-y">
        {draft.lines.map((l) => (
          <li key={l.productId} className="flex items-center gap-3 p-4">
            <div className="flex flex-1 flex-col">
              <span className="font-medium">{l.name}</span>
              <span className="text-muted-foreground text-xs">
                {qtyLabel(l.quantity, l.orderMode)}
                {l.presentation ? ` · ${l.presentation}` : ""}
                {l.estimatedWeightKg ? ` · ~${Number(l.estimatedWeightKg).toString().replace(".", ",")} kg` : ""}
              </span>
              {l.blocked && <span className="text-destructive text-xs">Ya no disponible</span>}
              {!l.blocked && l.priceChanged && (
                <span className="text-xs text-amber-600 dark:text-amber-500">Precio actualizado</span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="font-medium">{formatMoney(l.estimatedLineTotal)}</span>
              <Button
                size="xs"
                variant="ghost"
                disabled={isPending}
                onClick={() => remove(l.productId)}
              >
                Quitar
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 p-4">
        <label htmlFor="notes" className="text-sm font-medium">
          Observaciones
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej.: si no hay cremoso, mandar mozzarella"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-3 dark:bg-input/30"
        />
        <p className="text-muted-foreground text-xs">El total es estimado; puede ajustarse al preparar el pedido.</p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20">
        <div className="bg-background/95 mx-auto flex max-w-md items-center justify-between gap-3 border-t p-4 backdrop-blur">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Total estimado</span>
            <span className="text-lg font-semibold">{formatMoney(draft.estimatedTotal)}</span>
          </div>
          <Button size="lg" disabled={isPending || draft.hasBlocked} onClick={send}>
            {isPending ? "Enviando…" : "Enviar pedido"}
          </Button>
        </div>
      </div>
    </div>
  );
}
