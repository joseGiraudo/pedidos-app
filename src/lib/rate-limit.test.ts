import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, resetRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimit();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite hasta el límite y bloquea el siguiente", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("ip", 3, 1000).allowed).toBe(true);
    }
    const blocked = checkRateLimit("ip", 3, 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("vuelve a permitir cuando vence la ventana", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("ip", 3, 1000);
    expect(checkRateLimit("ip", 3, 1000).allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(checkRateLimit("ip", 3, 1000).allowed).toBe(true);
  });

  it("cuenta cada clave por separado", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("a", 3, 1000);
    expect(checkRateLimit("a", 3, 1000).allowed).toBe(false);
    expect(checkRateLimit("b", 3, 1000).allowed).toBe(true);
  });
});
