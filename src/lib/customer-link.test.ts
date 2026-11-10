import { describe, expect, it } from "vitest";

import { buildCustomerLink, buildShareMessage, buildWhatsappShareUrl } from "./customer-link";

describe("buildCustomerLink", () => {
  it("arma la URL del link personal", () => {
    expect(buildCustomerLink("https://app.com", "abc123")).toBe("https://app.com/p/abc123");
  });

  it("no duplica la barra final de la base", () => {
    expect(buildCustomerLink("https://app.com/", "abc123")).toBe("https://app.com/p/abc123");
    expect(buildCustomerLink("http://localhost:3000//", "tok")).toBe("http://localhost:3000/p/tok");
  });
});

describe("buildShareMessage", () => {
  it("incluye el nombre del negocio si está", () => {
    const msg = buildShareMessage("https://app.com/p/abc", "Kiosco Don Pepe");
    expect(msg).toContain("Kiosco Don Pepe");
    expect(msg).toContain("https://app.com/p/abc");
  });

  it("saluda genérico sin nombre", () => {
    expect(buildShareMessage("https://app.com/p/abc")).toContain("¡Hola!");
  });
});

describe("buildWhatsappShareUrl", () => {
  it("arma el wa.me con el texto codificado", () => {
    const url = buildWhatsappShareUrl("5493512345678", "https://app.com/p/abc", "Don Pepe");
    expect(url).not.toBeNull();
    expect(url).toMatch(/^https:\/\/wa\.me\/5493512345678\?text=/);
    expect(url).toContain(encodeURIComponent("https://app.com/p/abc"));
  });

  it("normaliza el teléfono a solo dígitos", () => {
    const url = buildWhatsappShareUrl("+54 9 351 234-5678", "https://app.com/p/abc");
    expect(url).toMatch(/^https:\/\/wa\.me\/5493512345678\?text=/);
  });

  it("devuelve null si no hay teléfono válido", () => {
    expect(buildWhatsappShareUrl(null, "https://app.com/p/abc")).toBeNull();
    expect(buildWhatsappShareUrl("", "https://app.com/p/abc")).toBeNull();
    expect(buildWhatsappShareUrl("123", "https://app.com/p/abc")).toBeNull();
  });
});
