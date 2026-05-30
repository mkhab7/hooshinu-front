// Streaming chat reader (§5). Two transports with automatic fallback:
//   Path A) relay-backed SSE (same-origin via nginx, high concurrency) — preferred
//   Path B) direct SSE to /chat/completions — fallback only when the relay is
//           intentionally disabled (503 error.type === "relay_disabled").
// EventSource can't send the Authorization header, so we read the SSE body
// manually with fetch + ReadableStream.
import { BASE, HooshinuError, api } from "./api";
import { getToken, getLocale } from "./auth";
import type { ChatCompletionRequest, ChatCompletionChunk } from "./types";

export type StreamCallbacks = {
  onDelta: (text: string) => void;
  onDone?: () => void;
  onError?: (err: HooshinuError) => void;
};

/** Read an SSE response body, invoking onDelta for each content chunk. */
async function readSSE(
  res: Response,
  onDelta: (text: string) => void
): Promise<void> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });

    let i: number;
    while ((i = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, i);
      buf = buf.slice(i + 2);

      // A single SSE event may contain multiple data: lines.
      for (const rawLine of raw.split("\n")) {
        const line = rawLine.replace(/^data: ?/, "").trim();
        if (!line || line === "[DONE]") continue;
        try {
          const chunk = JSON.parse(line) as ChatCompletionChunk;
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) onDelta(delta);
        } catch {
          /* ignore non-JSON keep-alive lines */
        }
      }
    }
  }
}

/**
 * Stream a chat completion. The request always forces `stream: true`.
 * Tries the relay transport first and falls back to direct SSE only when the
 * relay reports it is disabled; any other relay error surfaces to the user.
 */
export function streamChatCompletion(
  body: Omit<ChatCompletionRequest, "stream">,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { model, messages, web_search, reasoning_effort } = body;

  return (async () => {
    try {
      // Path A: relay-backed (preferred, high concurrency).
      try {
        const prep = await api<{ token: string }>("/chat/stream/prepare", {
          method: "POST",
          signal,
          body: JSON.stringify({ model, messages, web_search, reasoning_effort }),
        });
        // The relay is same-origin (behind nginx); the token in the query is
        // enough — no Bearer header needed.
        const res = await fetch(
          `/relay/stream?token=${encodeURIComponent(prep.token)}`,
          { signal, headers: { Accept: "text/event-stream" } }
        );
        if (!res.ok || !res.body) {
          throw new HooshinuError(
            "اتصال به سرور استریم برقرار نشد.",
            "relay_connect_failed",
            res.status
          );
        }
        await readSSE(res, callbacks.onDelta);
        callbacks.onDone?.();
        return;
      } catch (e) {
        // Fall back to Path B ONLY when the relay is intentionally disabled.
        // Re-throw anything else so it reaches the user.
        if ((e as HooshinuError)?.type !== "relay_disabled") throw e;
      }

      // Path B: direct SSE (existing behavior).
      const token = getToken();
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        signal,
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          "X-Locale": getLocale(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...body, stream: true }),
      });

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => null);
        const err = errJson?.error;
        callbacks.onError?.(
          new HooshinuError(
            err?.message ?? "خطا در دریافت پاسخ از سرور.",
            err?.type ?? "stream_error",
            res.status
          )
        );
        return;
      }

      await readSSE(res, callbacks.onDelta);
      callbacks.onDone?.();
    } catch (e) {
      // User-initiated abort is not an error.
      if (signal?.aborted || (e as Error)?.name === "AbortError") return;
      callbacks.onError?.(
        e instanceof HooshinuError
          ? e
          : new HooshinuError("اتصال استریم قطع شد.", "stream_error", 0)
      );
    }
  })();
}
