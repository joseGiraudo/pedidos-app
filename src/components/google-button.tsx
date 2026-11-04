"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// Inicia el flujo OAuth de Google y vuelve al panel. El alta del supplier en el
// primer ingreso la resuelve el hook de Better Auth (ver src/lib/auth.ts).
export function GoogleButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await authClient.signIn.social({ provider: "google", callbackURL: "/panel" });
      }}
    >
      {loading ? "Redirigiendo…" : "Entrar con Google"}
    </Button>
  );
}
