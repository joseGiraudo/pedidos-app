import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema";

// El Pool de Neon habla por WebSocket; en Node necesita un constructor explícito.
// (En el edge runtime WebSocket es global y esto no hace falta, pero no molesta.)
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL (ver .env.example)");
}

// Usamos el Pool (WebSockets) y no neon-http porque necesitamos transacciones
// interactivas: importación de planillas, aumentos masivos, numeración de pedidos
// y transiciones de estado. Ver docs/DECISIONES.md.
const pool = new Pool({ connectionString });

export const db = drizzle({ client: pool, schema });
