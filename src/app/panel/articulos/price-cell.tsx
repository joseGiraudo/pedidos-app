"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import type { PriceField } from "@/lib/validations/pricing";

import { updateProductPrice } from "./pricing-actions";

type PriceCellProps = {
  id: string;
  name: string;
  field: PriceField;
  value: string | null;
};

// "1000.00" (base) → "1000,00" para editar en formato argentino. "" / null → vacío.
function toEditable(value: string | null): string {
  if (value === null || value === "") return "";
  return value.replace(".", ",");
}

// Celda de precio con edición inline: click para editar, Enter guarda, Escape cancela.
// Hay un solo camino de guardado (vía onBlur): Enter y Escape disparan el blur. Reusa el
// patrón de useTransition + toast + router.refresh() de las acciones por fila.
export function PriceCell({ id, name, field, value }: PriceCellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => toEditable(value));
  const skipSave = useRef(false);
  const savingRef = useRef(false);

  const label = field === "wholesale" ? "mayorista" : "minorista";

  function startEdit() {
    setDraft(toEditable(value));
    setEditing(true);
  }

  function cancel() {
    setDraft(toEditable(value));
    setEditing(false);
  }

  function save() {
    const original = toEditable(value);
    if (draft.trim() === original.trim()) {
      setEditing(false);
      return;
    }
    savingRef.current = true;
    startTransition(async () => {
      const result = await updateProductPrice(id, field, draft);
      savingRef.current = false;
      if ("error" in result) {
        toast.error(result.error);
        setDraft(original);
        setEditing(false);
        return;
      }
      toast.success("Precio actualizado.");
      setEditing(false);
      router.refresh();
    });
  }

  // Único punto de guardado: Enter y Escape delegan en el blur para no duplicar el envío.
  function commit() {
    if (savingRef.current) return;
    if (skipSave.current) {
      skipSave.current = false;
      cancel();
      return;
    }
    save();
  }

  if (editing) {
    return (
      <Input
        autoFocus
        inputMode="decimal"
        aria-label={`Precio ${label} de «${name}»`}
        placeholder={field === "retail" ? "Usa el mayorista" : "0,00"}
        className="ml-auto h-7 w-28 text-right tabular-nums"
        value={draft}
        disabled={isPending}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            skipSave.current = true;
            e.currentTarget.blur();
          }
        }}
        onBlur={commit}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      title={`Editar precio ${label}`}
      className="hover:bg-muted/60 focus-visible:ring-ring/50 ml-auto inline-flex justify-end rounded px-1.5 py-0.5 tabular-nums transition-colors focus-visible:ring-3 focus-visible:outline-none"
    >
      {value ? formatMoney(value) : <span className="text-muted-foreground">—</span>}
    </button>
  );
}
