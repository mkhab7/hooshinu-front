import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./auth", () => ({
  getToken: vi.fn(() => "sk_test"),
  getLocale: vi.fn(() => "fa"),
}));

import { streamChatCompletion } from "./sse";
import { RELAY_BASE } from "./api";

/** Build a fake fetch Response whose body streams the given UTF-8 chunks. */
function streamResponse(
  chunks: string[],
  init: { ok?: boolean; status?: number } = {}
) {
  const { ok = true, status = 200 } = init;
  const enc = new TextEncoder();
  let i = 0;
  const body = {
    getReader() {
      return {
        read: async () => {
          if (i < chunks.length) {
            return { done: false, value: enc.encode(chunks[i++]) };
          }
          return { done: true, value: undefined };
        },
      };
    },
  };
  return {
    ok,
    status,
    body,
    json: async () => ({}),
  } as unknown as Response;
}

/** A JSON (non-stream) Response, e.g. for /chat/stream/prepare. */
function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number } = {}
) {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    body: null,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

function sseLine(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

function chunk(content?: string, finish: string | null = null) {
  return {
    id: "x",
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta: content ? { content } : {}, finish_reason: finish }],
  };
}

const isPrepare = (url: string) => url.includes("/chat/stream/prepare");
const isRelay = (url: string) => url.includes("/relay/stream");
const isDirect = (url: string) => url.includes("/chat/completions");

/**
 * Route fetch by URL so tests can drive Path A (relay) and Path B (direct)
 * independently. `prepareOk: false` simulates the relay being disabled.
 */
function routeFetch(opts: {
  prepare?: () => Response | Promise<Response>;
  relay?: () => Response | Promise<Response>;
  direct?: () => Response | Promise<Response>;
}) {
  return vi.fn(async (url: string) => {
    if (isPrepare(url)) {
      if (opts.prepare) return opts.prepare();
      return jsonResponse({ token: "relay_tok" });
    }
    if (isRelay(url)) {
      if (opts.relay) return opts.relay();
      return streamResponse(["data: [DONE]\n\n"]);
    }
    if (isDirect(url)) {
      if (opts.direct) return opts.direct();
      return streamResponse(["data: [DONE]\n\n"]);
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
}

/** Relay disabled → prepare returns 503 with error.type === "relay_disabled". */
function relayDisabledPrepare() {
  return jsonResponse(
    { error: { message: "relay off", type: "relay_disabled" } },
    { ok: false, status: 503 }
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("streamChatCompletion — relay path (A)", () => {
  it("emits a delta per content chunk and then calls onDone at [DONE]", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        relay: () =>
          streamResponse([
            sseLine(chunk("سلام")),
            sseLine(chunk(" دنیا")),
            sseLine(chunk(undefined, "stop")),
            "data: [DONE]\n\n",
          ]),
      })
    );

    const deltas: string[] = [];
    const onDone = vi.fn();
    const onError = vi.fn();

    await streamChatCompletion(
      { model: "m", messages: [{ role: "user", content: "hi" }] },
      { onDelta: (d) => deltas.push(d), onDone, onError }
    );

    expect(deltas).toEqual(["سلام", " دنیا"]);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("reassembles deltas split across read() boundaries", async () => {
    const full = sseLine(chunk("hello"));
    const mid = Math.floor(full.length / 2);
    vi.stubGlobal(
      "fetch",
      routeFetch({
        relay: () =>
          streamResponse([full.slice(0, mid), full.slice(mid), "data: [DONE]\n\n"]),
      })
    );

    const deltas: string[] = [];
    await streamChatCompletion(
      { model: "m", messages: [] },
      { onDelta: (d) => deltas.push(d) }
    );
    expect(deltas).toEqual(["hello"]);
  });

  it("ignores keep-alive / non-JSON lines", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        relay: () =>
          streamResponse([": keep-alive\n\n", sseLine(chunk("ok")), "data: [DONE]\n\n"]),
      })
    );
    const deltas: string[] = [];
    await streamChatCompletion(
      { model: "m", messages: [] },
      { onDelta: (d) => deltas.push(d) }
    );
    expect(deltas).toEqual(["ok"]);
  });

  it("passes the prepare token to the relay URL (no Bearer header needed)", async () => {
    const f = routeFetch({});
    vi.stubGlobal("fetch", f);
    await streamChatCompletion(
      { model: "m", messages: [] },
      { onDelta: () => {} }
    );
    const relayCall = f.mock.calls.find((c) => isRelay(c[0] as string));
    expect(relayCall?.[0]).toContain("token=relay_tok");
  });

  it("calls the relay with an ABSOLUTE URL on the backend origin (not relative)", async () => {
    const f = routeFetch({});
    vi.stubGlobal("fetch", f);
    await streamChatCompletion(
      { model: "m", messages: [] },
      { onDelta: () => {} }
    );
    const relayUrl = f.mock.calls.find((c) => isRelay(c[0] as string))?.[0] as string;
    // Must be absolute (starts with the relay origin), not a bare "/relay/...".
    expect(relayUrl.startsWith("/relay/")).toBe(false);
    expect(relayUrl).toBe(`${RELAY_BASE}/relay/stream?token=relay_tok`);
    // And the relay origin must NOT include the /v1 API prefix.
    expect(RELAY_BASE).not.toMatch(/\/v1$/);
  });

  it("does NOT fall back to direct on a non-relay_disabled error", async () => {
    const f = routeFetch({
      prepare: () =>
        jsonResponse(
          { error: { message: "اعتبار کافی نیست", type: "insufficient_credits" } },
          { ok: false, status: 402 }
        ),
    });
    vi.stubGlobal("fetch", f);

    const onError = vi.fn();
    await streamChatCompletion(
      { model: "m", messages: [] },
      { onDelta: () => {}, onError }
    );

    // No direct call attempted; the error surfaces to the user.
    expect(f.mock.calls.some((c) => isDirect(c[0] as string))).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({
      type: "insufficient_credits",
      status: 402,
    });
  });
});

describe("streamChatCompletion — fallback to direct (B)", () => {
  it("falls back to /chat/completions when the relay is disabled", async () => {
    const f = routeFetch({
      prepare: relayDisabledPrepare,
      direct: () => streamResponse([sseLine(chunk("ok")), "data: [DONE]\n\n"]),
    });
    vi.stubGlobal("fetch", f);

    const deltas: string[] = [];
    const onDone = vi.fn();
    await streamChatCompletion(
      { model: "m", messages: [] },
      { onDelta: (d) => deltas.push(d), onDone }
    );

    expect(f.mock.calls.some((c) => isDirect(c[0] as string))).toBe(true);
    expect(deltas).toEqual(["ok"]);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("forces stream:true in the direct request body", async () => {
    const f = routeFetch({
      prepare: relayDisabledPrepare,
      direct: () => streamResponse(["data: [DONE]\n\n"]),
    });
    vi.stubGlobal("fetch", f);
    await streamChatCompletion(
      { model: "m", messages: [], stream: false as never },
      { onDelta: () => {} }
    );
    const directCall = f.mock.calls.find((c) => isDirect(c[0] as string))!;
    const body = JSON.parse((directCall[1] as RequestInit).body as string);
    expect(body.stream).toBe(true);
  });

  it("surfaces a backend error from the direct path", async () => {
    const f = routeFetch({
      prepare: relayDisabledPrepare,
      direct: () =>
        ({
          ok: false,
          status: 402,
          body: null,
          json: async () => ({
            error: { message: "اعتبار کافی نیست", type: "insufficient_credits" },
          }),
        }) as unknown as Response,
    });
    vi.stubGlobal("fetch", f);

    const onError = vi.fn();
    const onDelta = vi.fn();
    await streamChatCompletion(
      { model: "m", messages: [] },
      { onDelta, onError }
    );

    expect(onDelta).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({
      type: "insufficient_credits",
      status: 402,
    });
  });
});

describe("streamChatCompletion — network", () => {
  it("calls onError on a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    const onError = vi.fn();
    await streamChatCompletion(
      { model: "m", messages: [] },
      { onDelta: () => {}, onError }
    );
    expect(onError).toHaveBeenCalledTimes(1);
    // The prepare call fails first → api() wraps it as a network error.
    expect(onError.mock.calls[0][0]).toMatchObject({ type: "network" });
  });
});
