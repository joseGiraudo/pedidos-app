// Armado del mensaje de WhatsApp del pedido (del kiosquero al proveedor). Lógica pura y
// testeable; la plantilla sigue docs/reglas-de-negocio.md.

import { formatDate, formatMoney } from "./format";

export type OrderMessageLine = {
  quantity: string;
  name: string;
  presentation: string | null;
  orderMode: "unit" | "piece" | "kg";
  estimatedWeightKg: string | null;
  estimatedLineTotal: string;
};

export type OrderMessageInput = {
  number: number;
  businessName: string;
  date: Date;
  lines: OrderMessageLine[];
  estimatedTotal: string;
  notes: string | null;
  orderLink: string;
};

/** Número en formato local: entero sin decimales, decimales con coma. */
function num(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return Number.isInteger(n) ? String(n) : n.toString().replace(".", ",");
}

function lineText(l: OrderMessageLine): string {
  const prefix = l.orderMode === "kg" ? `${num(l.quantity)} kg ×` : `${num(l.quantity)} ×`;

  const parens: string[] = [];
  if (l.presentation) parens.push(l.presentation);
  if (l.orderMode === "piece" && l.estimatedWeightKg) parens.push(`~${num(l.estimatedWeightKg)} kg`);
  const paren = parens.length ? ` (${parens.join(", ")})` : "";

  // El total es estimado cuando depende del peso (kg o pieza).
  const est = l.orderMode === "unit" ? "" : "est. ";

  return `• ${prefix} ${l.name}${paren} — ${est}${formatMoney(l.estimatedLineTotal)}`;
}

/** Mensaje completo del pedido para compartir por WhatsApp. */
export function buildOrderMessage(input: OrderMessageInput): string {
  const parts = [
    `*Pedido #${input.number} – ${input.businessName}*`,
    formatDate(input.date),
    "",
    input.lines.map(lineText).join("\n"),
    "",
    `Total estimado: ${formatMoney(input.estimatedTotal)}`,
  ];
  if (input.notes && input.notes.trim() !== "") {
    parts.push(`Notas: ${input.notes.trim()}`);
  }
  parts.push("", `Ver pedido: ${input.orderLink}`);
  return parts.join("\n");
}

/**
 * Link `wa.me` al WhatsApp del proveedor con el mensaje del pedido. `null` si el proveedor no
 * tiene un teléfono válido cargado (el pedido igual queda guardado).
 */
export function buildOrderWhatsappUrl(
  supplierPhone: string | null | undefined,
  message: string,
): string | null {
  const digits = (supplierPhone ?? "").replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
