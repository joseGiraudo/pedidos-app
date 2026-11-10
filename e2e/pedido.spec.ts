import { expect, test, type Page } from "@playwright/test";

// Email único por test para no chocar con corridas previas; el teardown los limpia.
const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

const PASSWORD = "secret123";

async function registrar(page: Page, email: string) {
  await page.goto("/registro");
  await page.getByLabel("Nombre del comercio").fill("Comercio E2E");
  await page.getByLabel("WhatsApp").fill("3512345678");
  await page.getByLabel("Tu nombre").fill("E2E Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test("pedido: el kiosquero arma, envía y repite un pedido", async ({ page, context }) => {
  // Test pesado: registra, crea artículo y cliente, arma/envía/repite el pedido. En el dev
  // server cada ruta compila on-demand en el primer uso, así que damos un margen amplio.
  test.setTimeout(120_000);

  await registrar(page, uniqueEmail());

  // Un artículo (el proveedor no usa códigos propios: se genera solo).
  await page.goto("/panel/articulos/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill("Alfajor E2E");
  await page.getByLabel(/Precio mayorista/).fill("1000,00");
  await page.getByRole("button", { name: "Crear artículo" }).click();
  await expect(page).toHaveURL(/\/panel\/articulos$/);

  // Un cliente.
  await page.goto("/panel/clientes/nuevo");
  await page.getByLabel("Nombre del negocio").fill("Kiosco E2E");
  await page.getByRole("button", { name: "Crear cliente" }).click();
  await expect(page).toHaveURL(/\/panel\/clientes$/);

  // Tomar el token del link personal (texto completo del <code>, aunque se vea truncado).
  const linkText = await page.locator("code").first().textContent();
  const token = linkText?.split("/p/")[1]?.trim();
  expect(token).toBeTruthy();

  // Cerrar automáticamente el popup de WhatsApp que abre el envío.
  context.on("page", (p) => void p.close().catch(() => {}));

  // Como kiosquero: armar el pedido.
  await page.goto(`/p/${token}`);
  await expect(page.getByRole("heading", { name: "Comercio E2E" })).toBeVisible();
  await page.getByRole("button", { name: "Agregar", exact: true }).first().click();
  // Esperar a que la action del borrador termine (el control queda habilitado).
  await expect(page.getByRole("button", { name: "Agregar uno" })).toBeEnabled();

  // Revisar y enviar.
  await page.getByRole("link", { name: "Revisar pedido" }).click();
  await expect(page).toHaveURL(new RegExp(`/p/${token}/revisar`));
  await page.getByRole("button", { name: "Enviar pedido" }).click();

  // Queda en el detalle del pedido enviado.
  await expect(page).toHaveURL(new RegExp(`/p/${token}/pedidos/\\d+`));
  await expect(page.getByText("Alfajor E2E")).toBeVisible();

  // Aparece en el historial.
  await page.goto(`/p/${token}/pedidos`);
  await expect(page.getByText(/Pedido #\d+/)).toBeVisible();

  // Repetir el pedido deja el artículo en el borrador y vuelve a la lista.
  await page.getByRole("link", { name: /Pedido #\d+/ }).first().click();
  await page.getByRole("button", { name: "Repetir pedido" }).click();
  await expect(page).toHaveURL(new RegExp(`/p/${token}$`));
  await expect(page.getByRole("link", { name: "Revisar pedido" })).toBeVisible();
});
