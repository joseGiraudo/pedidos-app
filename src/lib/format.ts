// Formato local argentino (ver CLAUDE.md): pesos con símbolo $, separador de miles
// con punto y decimales con coma. El dinero viaja como string `numeric` desde la base.

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea un monto en pesos argentinos. Devuelve "—" si no es un número válido. */
export function formatMoney(value: string | number): string {
  // `Number("")` es 0, no NaN: tratamos el string vacío como inválido aparte.
  if (typeof value === "string" && value.trim() === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return arsFormatter.format(n);
}

/** Fecha en formato local dd/mm/aaaa. */
export function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
}
