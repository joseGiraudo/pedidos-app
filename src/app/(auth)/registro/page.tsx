import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default async function RegistroPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/panel");
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md" size="default">
        <CardHeader>
          <CardTitle className="text-xl">Crear cuenta</CardTitle>
          <CardDescription>
            Registrá tu comercio para armar tu lista de precios y compartirla con tus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RegisterForm />
          <p className="text-muted-foreground text-sm">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
