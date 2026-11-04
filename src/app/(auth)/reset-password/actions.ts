"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/lib/validations/auth";

export type ResetResult = { error: string };

// Setea la nueva contraseña con el token del email. Ante éxito manda al login con un
// aviso; si el token venció o es inválido, lo informa para pedir uno nuevo.
export async function resetPassword(
  token: string,
  values: ResetPasswordFormValues,
): Promise<ResetResult> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Revisá los datos ingresados." };
  }

  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.password, token },
      headers: await headers(),
    });
  } catch (err) {
    if (err instanceof APIError) {
      return { error: "El link expiró o no es válido. Pedí uno nuevo." };
    }
    throw err;
  }

  redirect("/login?reset=1");
}
