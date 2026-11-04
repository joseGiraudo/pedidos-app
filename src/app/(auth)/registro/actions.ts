"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { registerSchema, type RegisterFormValues } from "@/lib/validations/auth";

export type RegisterResult = { error: string };

// Alta del proveedor: valida en el servidor y crea supplier + user (owner) vía
// Better Auth. El supplier lo crea el hook `user.create.before` a partir de
// businessName/whatsapp; `nextCookies()` deja la sesión iniciada. Ante éxito,
// redirige al panel; ante error, devuelve un mensaje para mostrar en el formulario.
export async function register(values: RegisterFormValues): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Revisá los datos ingresados." };
  }

  const { name, email, password, businessName, whatsapp } = parsed.data;

  // businessName/whatsapp no son campos de `user`: viajan en el body (el schema de
  // Better Auth los conserva) y los lee el hook para crear el supplier. Se arma en
  // una const para que TS los admita como propiedades extra.
  const body = { name, email, password, businessName, whatsapp };

  try {
    await auth.api.signUpEmail({
      body,
      headers: await headers(),
    });
  } catch (err) {
    if (err instanceof APIError) {
      const body = err.body as { code?: string; message?: string } | undefined;
      if (body?.code?.startsWith("USER_ALREADY_EXISTS")) {
        return { error: "Ya existe una cuenta con ese email." };
      }
      return { error: body?.message ?? "No se pudo crear la cuenta." };
    }
    throw err;
  }

  redirect("/panel");
}
