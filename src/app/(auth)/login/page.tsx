import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { GoogleButton } from "@/components/google-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

import { LoginForm } from "./login-form";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID);

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/panel");
  }

  const justReset = (await searchParams).reset === "1";

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md" size="default">
        <CardHeader>
          <CardTitle className="text-xl">Iniciar sesión</CardTitle>
          <CardDescription>Entrá a tu panel para gestionar tu lista y tus pedidos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {justReset && (
            <p className="text-sm text-green-700 dark:text-green-500">
              Tu contraseña se actualizó. Iniciá sesión con la nueva.
            </p>
          )}
          <LoginForm />
          {googleEnabled && (
            <>
              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <span className="bg-border h-px flex-1" />o
                <span className="bg-border h-px flex-1" />
              </div>
              <GoogleButton />
            </>
          )}
          <p className="text-muted-foreground flex justify-between gap-2 text-sm">
            <Link href="/recuperar" className="text-primary underline-offset-4 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
            <Link href="/registro" className="text-primary underline-offset-4 hover:underline">
              Crear cuenta
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
