// Thin typed fetch wrapper around the Hooshinu backend (§3 of the contract).
import { getToken, getLocale } from "./auth";
import type { ApiError } from "./types";

export const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ??
  "http://216.106.187.220/v1";

/** Error thrown by the api() wrapper; carries the backend's {message,type}. */
export class HooshinuError extends Error {
  type: string;
  status: number;
  /** Laravel field-validation errors, when present (422). */
  fieldErrors?: Record<string, string[]>;
  retryAfter?: number;

  constructor(
    message: string,
    type: string,
    status: number,
    extra?: { fieldErrors?: Record<string, string[]>; retryAfter?: number }
  ) {
    super(message);
    this.name = "HooshinuError";
    this.type = type;
    this.status = status;
    this.fieldErrors = extra?.fieldErrors;
    this.retryAfter = extra?.retryAfter;
  }
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const hasBody = opts.body != null;

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...opts,
      headers: {
        Accept: "application/json",
        "X-Locale": getLocale(),
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    });
  } catch {
    throw new HooshinuError(
      "خطای شبکه — اتصال به سرور برقرار نشد.",
      "network",
      0
    );
  }

  const json =
    res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfter = retryAfterHeader
      ? parseInt(retryAfterHeader, 10)
      : undefined;

    // Standard error envelope { error: { message, type } }
    if (json?.error) {
      const err = json.error as ApiError;
      throw new HooshinuError(err.message, err.type, res.status, {
        retryAfter,
      });
    }
    // Laravel field-validation: { message, errors: { field: [...] } }
    if (json?.errors) {
      throw new HooshinuError(
        json.message ?? "اطلاعات وارد شده معتبر نیست.",
        "validation_error",
        res.status,
        { fieldErrors: json.errors, retryAfter }
      );
    }
    throw new HooshinuError(
      json?.message ?? "خطای ناشناخته رخ داد.",
      "unknown",
      res.status,
      { retryAfter }
    );
  }

  return json as T;
}

/** Helper for endpoints that wrap their payload in { data: T }. */
export async function apiData<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const res = await api<{ data: T }>(path, opts);
  return res.data;
}

export function jsonBody(obj: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(obj) };
}
