import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Nueva contraseña",
};

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : undefined;
  const invalid = !token || sp.error === "INVALID_TOKEN";

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md" size="default">
        <CardHeader>
          <CardTitle className="text-xl">Nueva contraseña</CardTitle>
          <CardDescription>
            {invalid
              ? "El link no es válido o venció."
              : "Elegí una nueva contraseña para tu cuenta."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {invalid ? (
            <p className="text-sm">
              Pedí un{" "}
              <Link href="/recuperar" className="text-primary underline-offset-4 hover:underline">
                nuevo link de recuperación
              </Link>
              .
            </p>
          ) : (
            <ResetForm token={token} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
