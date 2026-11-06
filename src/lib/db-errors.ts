// Detección de errores conocidos de Postgres sobre el driver de Neon.

/** Violación de restricción UNIQUE (código SQLSTATE `23505`). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
