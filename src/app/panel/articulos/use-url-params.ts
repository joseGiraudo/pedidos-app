"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

// Actualiza los query params de la URL preservando el resto. Al cambiar filtros,
// búsqueda u orden se vuelve a la primera página (resetPage). El cambio de URL hace
// que el server component vuelva a consultar con los nuevos parámetros.
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (updates: Record<string, string | null>, opts?: { resetPage?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (opts?.resetPage) params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );
}
