import { defineConfig } from "drizzle-kit";
import "dotenv/config";

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
