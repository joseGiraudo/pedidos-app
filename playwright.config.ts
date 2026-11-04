import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Carga el entorno (DATABASE_URL para el teardown; el dev server de Next carga el suyo).
config({ path: ".env.local" });
config();

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // Secuencial: comparten la base dev y crean usuarios reales.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  globalTeardown: "./e2e/global-teardown.ts",
  // Holgado: en dev las rutas y server actions compilan on-demand en el primer uso.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
