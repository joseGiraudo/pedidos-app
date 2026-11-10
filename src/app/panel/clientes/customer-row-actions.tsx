"use client";

import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { setCustomerActive, type ToggleResult } from "./actions";

type CustomerRowActionsProps = {
  id: string;
  businessName: string;
  isActive: boolean;
};

// Acciones por fila de la lista de clientes: editar y dar de baja / reactivar (baja
// lógica, reversible). Al desactivar, el link del cliente también deja de funcionar.
export function CustomerRowActions({ id, businessName, isActive }: CustomerRowActionsProps) {
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
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`Editar «${businessName}»`}
        title="Editar"
        render={<Link href={`/panel/clientes/${id}/editar`} />}
      >
        <PencilIcon />
      </Button>

      {isActive ? (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Dar de baja «${businessName}»`}
          title="Dar de baja"
          disabled={isPending}
          onClick={() => run(() => setCustomerActive(id, false), "Cliente dado de baja.")}
        >
          <ArchiveIcon />
        </Button>
      ) : (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Reactivar «${businessName}»`}
          title="Reactivar"
          disabled={isPending}
          onClick={() => run(() => setCustomerActive(id, true), "Cliente reactivado.")}
        >
          <ArchiveRestoreIcon />
        </Button>
      )}
    </div>
  );
}
