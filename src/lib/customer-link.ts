// Armado del link personal del cliente y del link de WhatsApp para compartírselo.
// Lógica pura y testeable: no toca la base ni el DOM.

/** Link personal del cliente: `${baseUrl}/p/<token>` (sin barra final duplicada). */
export function buildCustomerLink(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/p/${token}`;
}

/** Mensaje de invitación que acompaña al link al compartirlo por WhatsApp. */
export function buildShareMessage(link: string, businessName?: string): string {
  const hello = businessName ? `¡Hola, ${businessName}!` : "¡Hola!";
  return `${hello} Este es tu link personal para ver la lista y hacer tus pedidos:\n${link}`;
}

/**
 * Link `wa.me` para enviarle el link personal al cliente por WhatsApp. El teléfono debe
 * venir en solo dígitos con característica (ver `normalizeWhatsapp`). Devuelve `null` si no
 * hay un teléfono válido, para que la UI deshabilite el botón.
 */
export function buildWhatsappShareUrl(
  phone: string | null | undefined,
  link: string,
  businessName?: string,
): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(digits)) return null;
  const text = encodeURIComponent(buildShareMessage(link, businessName));
  return `https://wa.me/${digits}?text=${text}`;
}
