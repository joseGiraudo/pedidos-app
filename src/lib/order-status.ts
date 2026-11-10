// Etiquetas en castellano de los estados del pedido (ver docs/reglas-de-negocio.md).

export type OrderStatus =
  | "draft"
  | "sent"
  | "changes_requested"
  | "accepted"
  | "delivered"
  | "rejected"
  | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Borrador",
  sent: "Enviado",
  changes_requested: "Modificación solicitada",
  accepted: "Aceptado",
  delivered: "Entregado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};
