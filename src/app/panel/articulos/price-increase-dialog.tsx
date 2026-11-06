"use client";

import { Dialog } from "@base-ui/react/dialog";
import { TrendingUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { computeProductChange, type PriceTarget, type RoundingMode } from "@/lib/pricing";
import {
  PRICE_MULTIPLES,
  priceIncreaseSchema,
  type RoundingModeInput,
} from "@/lib/validations/pricing";

import type { ProductRow } from "./articles-table";
import { applyPriceIncrease } from "./pricing-actions";

type PriceIncreaseDialogProps = {
  rows: ProductRow[];
  onApplied: () => void;
};

// Porcentaje en formato argentino con signo opcional: "-5,5" → -5.5. `parseArgNumber`
// rechaza el signo, así que acá se parsea aparte.
function parsePercent(raw: string): number | null {
  const s = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const TARGET_LABELS: Record<PriceTarget, string> = {
  wholesale: "Solo mayorista",
  retail: "Solo minorista",
  both: "Mayorista y minorista",
};

export function PriceIncreaseDialog({ rows, onApplied }: PriceIncreaseDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [percentInput, setPercentInput] = useState("");
  const [target, setTarget] = useState<PriceTarget>("both");
  const [multiple, setMultiple] = useState<number>(0);
  const [mode, setMode] = useState<RoundingModeInput>("up");
  const [description, setDescription] = useState("");

  const percentage = parsePercent(percentInput);
  const count = rows.length;

  // Descripción por defecto (editable): "+8% · 12 artículos".
  const defaultDescription = useMemo(() => {
    if (percentage === null) return "";
    const sign = percentage > 0 ? "+" : "";
    const pct = percentInput.trim();
    return `${sign}${pct}% · ${count} ${count === 1 ? "artículo" : "artículos"}`;
  }, [percentage, percentInput, count]);

  // Vista previa calculada en el cliente con la lógica pura de pricing.ts; el servidor la
  // recalcula al aplicar, así que es solo indicativa. Vacía si el porcentaje no es válido.
  const preview = useMemo(() => {
    if (percentage === null) return [];
    const params = { percentage, multiple, mode: mode as RoundingMode, target };
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      change: computeProductChange(
        { wholesale: row.wholesalePrice, retail: row.retailPrice },
        params,
      ),
    }));
  }, [rows, percentage, multiple, mode, target]);

  const showRetail = target === "retail" || target === "both";
  const canApply = percentage !== null && count > 0 && !isPending;

  function reset() {
    setPercentInput("");
    setTarget("both");
    setMultiple(0);
    setMode("up");
    setDescription("");
  }

  function apply() {
    if (percentage === null) return;
    const payload = {
      ids: rows.map((r) => r.id),
      percentage,
      multiple: multiple as (typeof PRICE_MULTIPLES)[number],
      mode,
      target,
      description: description.trim() === "" ? defaultDescription : description.trim(),
    };
    // Revalidación en el cliente antes de ir al servidor (mismo esquema, una sola forma).
    if (!priceIncreaseSchema.safeParse(payload).success) {
      toast.error("Revisá los datos del aumento.");
      return;
    }
    startTransition(async () => {
      const result = await applyPriceIncrease(payload);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Precios actualizados: ${result.affectedCount} ${
          result.affectedCount === 1 ? "artículo" : "artículos"
        }.`,
      );
      setOpen(false);
      reset();
      onApplied();
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <TrendingUpIcon />
        Aumentar precios…
      </Button>

      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
          <Dialog.Popup className="bg-background fixed top-1/2 left-1/2 flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-xl border p-6 shadow-lg">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-lg font-semibold">Aumentar precios</Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                Se aplicará a {count} {count === 1 ? "artículo" : "artículos"}. Un porcentaje
                negativo aplica una rebaja.
              </Dialog.Description>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="percent">Porcentaje (%)</Label>
                <Input
                  id="percent"
                  autoFocus
                  inputMode="decimal"
                  placeholder="8"
                  value={percentInput}
                  onChange={(e) => setPercentInput(e.target.value)}
                  aria-invalid={percentInput.trim() !== "" && percentage === null}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="target">Aplicar a</Label>
                <select
                  id="target"
                  className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
                  value={target}
                  onChange={(e) => setTarget(e.target.value as PriceTarget)}
                >
                  {(Object.keys(TARGET_LABELS) as PriceTarget[]).map((t) => (
                    <option key={t} value={t}>
                      {TARGET_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="multiple">Redondeo</Label>
                <select
                  id="multiple"
                  className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
                  value={multiple}
                  onChange={(e) => setMultiple(Number(e.target.value))}
                >
                  <option value={0}>Sin redondeo</option>
                  <option value={10}>Al $10</option>
                  <option value={50}>Al $50</option>
                  <option value={100}>Al $100</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mode">Dirección</Label>
                <select
                  id="mode"
                  className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm disabled:opacity-50"
                  value={mode}
                  disabled={multiple === 0}
                  onChange={(e) => setMode(e.target.value as RoundingModeInput)}
                >
                  <option value="up">Hacia arriba</option>
                  <option value="nearest">Al más cercano</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                placeholder={defaultDescription || "Ej: +8% Arcor"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {preview.length > 0 && (
              <div className="rounded-lg border">
                <div className="text-muted-foreground bg-muted/50 px-3 py-1.5 text-xs font-medium">
                  Vista previa
                </div>
                <ul className="divide-border max-h-56 divide-y overflow-y-auto text-sm">
                  {preview.map(({ id, name, change }) => (
                    <li key={id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                      <span className="truncate">{name}</span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {formatMoney(change.oldWholesale)} → {formatMoney(change.newWholesale)}
                        {showRetail && change.newRetail !== null && (
                          <span className="ml-2 opacity-70">
                            (min. {formatMoney(change.newRetail)})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Dialog.Close
                render={
                  <Button variant="outline" disabled={isPending}>
                    Cancelar
                  </Button>
                }
              />
              <Button onClick={apply} disabled={!canApply}>
                {isPending ? "Aplicando…" : "Aplicar"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
