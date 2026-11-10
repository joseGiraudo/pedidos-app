"use client";

import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { regenerateToken } from "./actions";

type CustomerLinkCellProps = {
  id: string;
  /** Link personal completo del cliente (`${baseUrl}/p/<token>`). */
  link: string;
};

// Celda del link personal del cliente: copiar al portapapeles y regenerar (invalida el
// link anterior). La regeneración pide confirmación inline porque es irreversible.
export function CustomerLinkCell({ id, link }: CustomerLinkCellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("No se pudo copiar. Copialo a mano.");
    }
  }

  function regenerate() {
    startTransition(async () => {
      const result = await regenerateToken(id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setConfirming(false);
      toast.success("Link regenerado. El anterior ya no funciona.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <code className="bg-muted/50 max-w-[22ch] truncate rounded px-1.5 py-0.5 text-xs" title={link}>
          {link}
        </code>
        <Button size="icon-sm" variant="ghost" aria-label="Copiar link" title="Copiar link" onClick={copy}>
          <CopyIcon />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Regenerar link"
          title="Regenerar link"
          disabled={isPending}
          onClick={() => setConfirming(true)}
        >
          <RefreshCwIcon />
        </Button>
      </div>

      {confirming && (
        <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md p-2 text-xs">
          <span className="flex-1">¿Regenerar? El link actual dejará de funcionar.</span>
          <Button size="sm" variant="destructive" disabled={isPending} onClick={regenerate}>
            Regenerar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
