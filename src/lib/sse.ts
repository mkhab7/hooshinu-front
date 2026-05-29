// Streaming chat reader (§5). EventSource can't send the Authorization header,
// so we read the SSE body manually with fetch + ReadableStream.
import { BASE, HooshinuError } from "./api";
import { getToken, getLocale } from "./auth";
import type { ChatCompletionRequest, ChatCompletionChunk } from "./types";

export type StreamCallbacks = {
  onDelta: (text: string) => void;
  onDone?: () => void;
  onError?: (err: HooshinuError) => void;
};

/**
 * Stream a chat completion. Returns a function to abort the request.
 * The request always forces `stream: true`.
 */
export function streamChatCompletion(
  body: Omit<ChatCompletionRequest, "stream">,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const token = getToken();

  return (async () => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/chat/completions`, {
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
    } catch {
      callbacks.onError?.(
        new HooshinuError("خطای شبکه — اتصال به سرور برقرار نشد.", "network", 0)
      );
      return;
    }

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

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";

    try {
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
            if (!line) continue;
            if (line === "[DONE]") {
              callbacks.onDone?.();
              return;
            }
            try {
              const chunk = JSON.parse(line) as ChatCompletionChunk;
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) callbacks.onDelta(delta);
            } catch {
              /* ignore non-JSON keep-alive lines */
            }
          }
        }
      }
      callbacks.onDone?.();
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      callbacks.onError?.(
        new HooshinuError("اتصال استریم قطع شد.", "stream_error", 0)
      );
    }
  })();
}
