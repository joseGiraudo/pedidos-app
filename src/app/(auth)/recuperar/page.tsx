import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { RecuperarForm } from "./recuperar-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function RecuperarPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md" size="default">
        <CardHeader>
          <CardTitle className="text-xl">Recuperar contraseña</CardTitle>
          <CardDescription>
            Ingresá tu email y te enviamos un link para elegir una nueva contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RecuperarForm />
          <p className="text-muted-foreground text-sm">
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Volver al login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
