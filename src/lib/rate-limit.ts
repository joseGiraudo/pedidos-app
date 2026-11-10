// Límite de intentos en memoria (ventana fija por clave). Pensado para frenar fuerza
// bruta de tokens en /p/* a la escala del MVP (ver docs/DECISIONES.md).
//
// Es best-effort: en serverless el estado NO se comparte entre instancias (cada una tiene
// su propio Map), así que el límite es orientativo, no estricto. Suficiente para encarecer
// el escaneo de tokens de 32+ caracteres. No es apto como control de seguridad fuerte.

type Bucket = { count: number; expiresAt: number };

const buckets = new Map<string, Bucket>();

// A partir de cuántas claves vivas barremos las vencidas, para no crecer sin límite.
const SWEEP_THRESHOLD = 10_000;

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.expiresAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

/**
 * Registra un intento para `key` y dice si está permitido. Hasta `limit` intentos por
 * ventana de `windowMs`; superado el límite, `allowed=false` hasta que la ventana vence.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.expiresAt <= now) {
    if (buckets.size >= SWEEP_THRESHOLD) sweep(now);
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  bucket.count++;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterMs: bucket.expiresAt - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

/** Sólo para tests: vacía el estado acumulado. */
export function resetRateLimit(): void {
  buckets.clear();
}
