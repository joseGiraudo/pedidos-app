"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { repeatOrder } from "../../actions";

export function RepeatButton({ token, orderNumber }: { token: string; orderNumber: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function repeat() {
    startTransition(async () => {
      const result = await repeatOrder(token, orderNumber);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.skipped > 0
          ? `Pedido copiado. Saltamos ${result.skipped} artículo(s) que ya no están disponibles.`
          : "Pedido copiado a tu borrador.",
      );
      router.push(`/p/${token}`);
      router.refresh();
    });
  }

  return (
    <Button size="lg" disabled={isPending} onClick={repeat}>
      {isPending ? "Copiando…" : "Repetir pedido"}
    </Button>
  );
}
