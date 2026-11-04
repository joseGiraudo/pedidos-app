"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/lib/validations/auth";

export type ForgotPasswordResult = { ok: true } | { error: string };

// Pide el envío del link de recuperación. Siempre devuelve ok (no revela si el email
// existe); el envío real lo hace Better Auth vía sendResetPassword.
export async function requestReset(
  values: ForgotPasswordFormValues,
): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Revisá el email ingresado." };
  }

  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: "/reset-password" },
      headers: await headers(),
    });
  } catch {
    // No filtramos errores internos ni la existencia del email.
  }

  return { ok: true };
}
