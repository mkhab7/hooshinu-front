import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./auth", () => ({
  getToken: vi.fn(() => "sk_test"),
  getLocale: vi.fn(() => "fa"),
}));

import { streamChatCompletion } from "./sse";

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("streamChatCompletion", () => {
  it("emits a delta per content chunk and then calls onDone at [DONE]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        streamResponse([
          sseLine(chunk("سلام")),
          sseLine(chunk(" دنیا")),
          sseLine(chunk(undefined, "stop")),
          "data: [DONE]\n\n",
        ])
      )
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
      vi.fn(async () =>
        streamResponse([full.slice(0, mid), full.slice(mid), "data: [DONE]\n\n"])
      )
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
      vi.fn(async () =>
        streamResponse([": keep-alive\n\n", sseLine(chunk("ok")), "data: [DONE]\n\n"])
      )
    );
    const deltas: string[] = [];
    await streamChatCompletion(
      { model: "m", messages: [] },
      { onDelta: (d) => deltas.push(d) }
    );
    expect(deltas).toEqual(["ok"]);
  });

  it("forces stream:true in the request body", async () => {
    const f = vi.fn(async () => streamResponse(["data: [DONE]\n\n"]));
    vi.stubGlobal("fetch", f);
    await streamChatCompletion(
      { model: "m", messages: [], stream: false as never },
      { onDelta: () => {} }
    );
    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.stream).toBe(true);
  });

  it("calls onError with the backend error on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 402,
        body: null,
        json: async () => ({
          error: { message: "اعتبار کافی نیست", type: "insufficient_credits" },
        }),
      }) as unknown as Response)
    );

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
    expect(onError.mock.calls[0][0]).toMatchObject({ type: "network" });
  });
});
