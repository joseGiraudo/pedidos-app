import { expect, test } from "@playwright/test";

// Email único por test para no chocar con corridas previas; el teardown los limpia.
const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

const PASSWORD = "secret123";

async function registrar(
  page: import("@playwright/test").Page,
  email: string,
  nombre = "E2E Owner",
) {
  await page.goto("/registro");
  await page.getByLabel("Nombre del comercio").fill("Comercio E2E");
  await page.getByLabel("WhatsApp").fill("3512345678");
  await page.getByLabel("Tu nombre").fill(nombre);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
}

test("registro: crea la cuenta y entra al panel", async ({ page }) => {
  await registrar(page, uniqueEmail());
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { name: "Hola, E2E Owner" })).toBeVisible();
  await expect(page.getByText("Comercio: Comercio E2E")).toBeVisible();
});

test("protección: /panel sin sesión redirige al login", async ({ page }) => {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/login$/);
});

test("login y logout: cierra sesión y vuelve a entrar", async ({ page }) => {
  const email = uniqueEmail();
  await registrar(page, email, "E2E Login");
  await expect(page).toHaveURL(/\/panel$/);

  // Logout → vuelve al login.
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // /panel sigue protegido tras el logout.
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/login$/);

  // Login con las credenciales recién creadas.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { name: "Hola, E2E Login" })).toBeVisible();
});

test("login: credenciales inválidas muestran error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Contraseña").fill("claveIncorrecta");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
