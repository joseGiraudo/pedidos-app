"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";

export type LoginResult = { error: string };

// Inicio de sesión: valida en el servidor y delega en Better Auth. `nextCookies()`
// persiste la cookie de sesión; ante éxito redirige al panel. El mensaje de error es
// genérico a propósito (no revela si falló el email o la contraseña).
export async function login(values: LoginFormValues): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Revisá los datos ingresados." };
  }

  const { email, password } = parsed.data;

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (err) {
    if (err instanceof APIError) {
      return { error: "Email o contraseña incorrectos." };
    }
    throw err;
  }

  redirect("/panel");
}
