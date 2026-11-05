"use client";

import { ArchiveIcon, ArchiveRestoreIcon, PackageXIcon, PackageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { setProductActive, setProductAvailable, type ToggleResult } from "./actions";

type ArticleRowActionsProps = {
  id: string;
  name: string;
  isAvailable: boolean;
  isActive: boolean;
};

// Acciones por fila de la lista de artículos: marcar sin stock / disponible y
// dar de baja / reactivar (baja lógica, reversible). Usa las server actions
// directamente y refresca el server component al terminar (patrón de taxonomy-manager).
export function ArticleRowActions({ id, name, isAvailable, isActive }: ArticleRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<ToggleResult>, okMessage: string) {
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(okMessage);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {isActive &&
        (isAvailable ? (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Marcar «${name}» sin stock`}
            title="Marcar sin stock"
            disabled={isPending}
            onClick={() => run(() => setProductAvailable(id, false), "Marcado sin stock.")}
          >
            <PackageXIcon />
          </Button>
        ) : (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Marcar «${name}» disponible`}
            title="Marcar disponible"
            disabled={isPending}
            onClick={() => run(() => setProductAvailable(id, true), "Marcado disponible.")}
          >
            <PackageIcon />
          </Button>
        ))}

      {isActive ? (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Dar de baja «${name}»`}
          title="Dar de baja"
          disabled={isPending}
          onClick={() => run(() => setProductActive(id, false), "Artículo dado de baja.")}
        >
          <ArchiveIcon />
        </Button>
      ) : (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Reactivar «${name}»`}
          title="Reactivar"
          disabled={isPending}
          onClick={() => run(() => setProductActive(id, true), "Artículo reactivado.")}
        >
          <ArchiveRestoreIcon />
        </Button>
      )}
    </div>
  );
}
