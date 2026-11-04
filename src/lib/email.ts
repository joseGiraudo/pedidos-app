import { Resend } from "resend";

// Envío de emails con Resend. Si no hay RESEND_API_KEY (entorno de desarrollo),
// no se envía: se loguea el contenido por consola para poder seguir el flujo.
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Pedidos <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

type SendEmailArgs = { to: string; subject: string; html: string; text: string };

export async function sendEmail({ to, subject, html, text }: SendEmailArgs): Promise<void> {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY no configurada; no se envía.\n  Para: ${to}\n  Asunto: ${subject}\n  ${text}`,
    );
    return;
  }

  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    throw new Error(`No se pudo enviar el email: ${error.message}`);
  }
}

/** Email con el link para restablecer la contraseña. */
export async function sendPasswordResetEmail(to: string, url: string): Promise<void> {
  const subject = "Restablecé tu contraseña";
  const text =
    `Pediste restablecer tu contraseña. Abrí este link para elegir una nueva ` +
    `(vence en 1 hora):\n\n${url}\n\nSi no fuiste vos, ignorá este mensaje.`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2>Restablecé tu contraseña</h2>
      <p>Pediste restablecer tu contraseña. El link vence en 1 hora.</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:8px;text-decoration:none;">Elegir nueva contraseña</a></p>
      <p style="color:#666;font-size:14px;">Si no fuiste vos, ignorá este mensaje.</p>
    </div>
  `;
  await sendEmail({ to, subject, html, text });
}
