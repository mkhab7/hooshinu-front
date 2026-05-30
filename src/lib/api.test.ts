import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the auth module so api() doesn't touch localStorage.
vi.mock("./auth", () => ({
  getToken: vi.fn(() => null),
  getLocale: vi.fn(() => "fa"),
}));

import { api, apiData, jsonBody, HooshinuError, BASE } from "./api";
import { getToken } from "./auth";

function mockFetch(
  body: unknown,
  init: { ok?: boolean; status?: number; headers?: Record<string, string> } = {}
) {
  const { ok = true, status = 200, headers = {} } = init;
  const res = {
    ok,
    status,
    headers: { get: (k: string) => headers[k] ?? null },
    json: async () => body,
  };
  return vi.fn(async () => res as unknown as Response);
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("api()", () => {
  it("returns parsed JSON on success", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: { id: 1 } }));
    const out = await api<{ data: { id: number } }>("/me");
    expect(out).toEqual({ data: { id: 1 } });
  });

  it("sends Accept and X-Locale headers", async () => {
    const f = mockFetch({ ok: true });
    vi.stubGlobal("fetch", f);
    await api("/me");
    const [, opts] = f.mock.calls[0];
    const headers = (opts as RequestInit).headers as Record<string, string>;
    expect(headers.Accept).toBe("application/json");
    expect(headers["X-Locale"]).toBe("fa");
  });

  it("attaches Authorization header when a token exists", async () => {
    vi.mocked(getToken).mockReturnValue("sk_test");
    const f = mockFetch({});
    vi.stubGlobal("fetch", f);
    await api("/me");
    const [, opts] = f.mock.calls[0];
    const headers = (opts as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk_test");
  });

  it("omits Authorization header when there is no token", async () => {
    const f = mockFetch({});
    vi.stubGlobal("fetch", f);
    await api("/models");
    const [, opts] = f.mock.calls[0];
    const headers = (opts as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("adds Content-Type only when a body is present", async () => {
    const f = mockFetch({});
    vi.stubGlobal("fetch", f);
    await api("/x", { method: "POST", body: JSON.stringify({ a: 1 }) });
    const [, opts] = f.mock.calls[0];
    const headers = (opts as RequestInit).headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("prefixes the path with BASE", async () => {
    const f = mockFetch({});
    vi.stubGlobal("fetch", f);
    await api("/wallet");
    expect(f.mock.calls[0][0]).toBe(`${BASE}/wallet`);
  });

  it("returns null for a 204 response without parsing", async () => {
    const f = vi.fn(async () => ({
      ok: true,
      status: 204,
      headers: { get: () => null },
      json: async () => {
        throw new Error("should not be called");
      },
    }) as unknown as Response);
    vi.stubGlobal("fetch", f);
    const out = await api("/logout", { method: "POST" });
    expect(out).toBeNull();
  });

  it("throws HooshinuError from the standard {error} envelope", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        { error: { message: "اعتبار کافی نیست", type: "insufficient_credits" } },
        { ok: false, status: 402 }
      )
    );
    await expect(api("/x")).rejects.toMatchObject({
      message: "اعتبار کافی نیست",
      type: "insufficient_credits",
      status: 402,
    });
  });

  it("parses Laravel field-validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        { message: "validation failed", errors: { phone: ["شماره نامعتبر"] } },
        { ok: false, status: 422 }
      )
    );
    try {
      await api("/auth/otp/request", { method: "POST", body: "{}" });
      expect.unreachable("should have thrown");
    } catch (e) {
      const err = e as HooshinuError;
      expect(err).toBeInstanceOf(HooshinuError);
      expect(err.type).toBe("validation_error");
      expect(err.fieldErrors?.phone?.[0]).toBe("شماره نامعتبر");
    }
  });

  it("captures the Retry-After header on rate limits", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        { error: { message: "صبر کنید", type: "otp_throttled" } },
        { ok: false, status: 429, headers: { "Retry-After": "42" } }
      )
    );
    try {
      await api("/auth/otp/request", { method: "POST", body: "{}" });
      expect.unreachable();
    } catch (e) {
      expect((e as HooshinuError).retryAfter).toBe(42);
    }
  });

  it("wraps network failures into a HooshinuError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    await expect(api("/x")).rejects.toMatchObject({ type: "network", status: 0 });
  });

  it("falls back to an unknown error when shape is unrecognized", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ weird: true }, { ok: false, status: 500 })
    );
    await expect(api("/x")).rejects.toMatchObject({
      type: "unknown",
      status: 500,
    });
  });
});

describe("apiData()", () => {
  it("unwraps the data envelope", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: { credits: 10 } }));
    const out = await apiData<{ credits: number }>("/me");
    expect(out).toEqual({ credits: 10 });
  });
});

describe("jsonBody()", () => {
  it("produces a POST RequestInit with a serialized body", () => {
    const init = jsonBody({ a: 1 });
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
  });
});
