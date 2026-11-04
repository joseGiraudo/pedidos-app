import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Next carga .env.local automáticamente; drizzle-kit no, así que lo cargamos acá.
// .env.local tiene prioridad; .env queda de fallback (dotenv no pisa lo ya cargado).
config({ path: ".env.local" });
config();

// drizzle-kit (migraciones, studio) usa la conexión directa (sin pooler),
// no la pooled que usa la app en runtime.
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  throw new Error("Falta DATABASE_URL_UNPOOLED (ver .env.example)");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
