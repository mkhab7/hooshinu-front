# Hooshinu — Frontend Handoff & API Contract (v1.3)

> **How to use this file:** Open a fresh session and paste this whole file as the
> first message. It is self-contained: it tells the assistant what to build, the
> exact backend contract, the architecture decisions already made, and what NOT
> to assume. It is a **snapshot of the backend** — if the backend changes, update
> this file (or have the assistant also read the live spec at
> `http://216.106.187.220/docs/api.json`).

---

## Changelog

- **v1.3** — Clarified that the relay (`/relay/stream`) must be called with an
  **absolute URL** on the backend origin (`RELAY_BASE`), not a relative path: in
  dev the SPA is on a different origin (`localhost:3000`) so a relative
  `/relay/stream` 404s against the Next dev server. This also makes the relay
  call cross-origin in dev, so nginx must send CORS headers on `/relay/*`
  (harmless to same-origin Livewire). Same code works in dev and prod.
- **v1.2** — Added `POST /v1/chat/stream/prepare` (Bearer auth): a relay-backed
  streaming handshake for the SPA, so long chat streams don't pin PHP workers.
  Returns a short-lived token the SPA hands to `GET /relay/stream?token=…`
  (same SSE wire format as the direct path). Returns **503** when the relay
  isn't configured — the SPA should fall back to direct `/v1/chat/completions`
  SSE in that case. The two-path § in this doc is updated accordingly. The
  direct path is unchanged.
- **v1.1** — Clarified streaming-vs-persistence trade-offs in §5.
- **v1.0** — Initial contract: auth/OTP, profile (`/me` + `PATCH /me`), models,
  conversations (persisted, non-stream), `chat/completions` (stateless +
  streaming SSE), generations (poll-based), wallet/payments/plans, api-keys.

## Backend Roadmap (open, not yet implemented)

These are known gaps the frontend must NOT assume exist. Build against the
current contract; when they land, this file will bump and add their endpoints.

1. **Streamed + persisted chat with Bearer auth.** Today streaming is stateless
   (no history) and persisted chat is not streamed (full reply at once). No
   single Bearer-auth endpoint does both. ✅ A relay-backed *stateless* stream
   exists now (v1.2); a *persisted* variant is still pending.
2. **Bazaar (cafebazaar) in-app billing** as an additional payment gateway. Only
   redirect-style payments (Zarinpal) exist today.

---

## 0) Instructions for the assistant (read first)

You are a **senior frontend engineer**. Build the web client for **Hooshinu**, a
Persian-first (RTL), multi-model AI platform (chat + image/video/audio
generation, wallet/credits, subscription plans). The backend already exists and
is described below — **do not change or assume the backend; consume it as
specified.**

**Stack (already decided — don't swap):**
- **Next.js (App Router) as an SPA / CSR** — `"use client"` components calling
  the backend directly. No SSR data-fetching, no Next API routes/BFF. (SSR only
  acceptable for a public landing page later.)
- **React + TypeScript**, **Tailwind CSS v4**, RTL-first with dark mode.
- Data fetching: **TanStack Query** (react-query) + a thin typed `fetch` wrapper.
- State: React state + Query cache; a small auth store (Zustand or Context).
- **Dockerized**, clean and scalable structure (see §7).

**Hard rules:**
- Persian-first UI, `dir="rtl"`, Vazirmatn font, full dark mode. Use logical CSS
  (`ms/me`, `ps/pe`, `start/end`) so it could flip to LTR for `en`.
- Auth is **Bearer token** (not cookies/sessions). Send
  `Authorization: Bearer <token>` on every protected call.
- Every error response is `{ "error": { "message": string, "type": string } }`.
  Show `message` (already localized) to the user; branch on `type` in code.
- Send `X-Locale: fa` (or `en`) on requests; the server echoes `Content-Language`.
- **Do not assume a streamed+persisted chat endpoint exists** — see §5 carefully.
- Confirm the two architecture choices in §8 are respected.

**First steps:** scaffold the project (§7), build the typed API client (§3) and
auth flow (§4.1), then the chat screen (§5), then dashboard/studio/wallet.

---

## 1) Project summary (for the human)

Hooshinu lets users chat with multiple AI models and generate media, paying with
a credit wallet and optional subscription plans. Login is **passwordless** (phone
+ OTP). This handoff covers the **web client**; the backend is a Laravel API
served at `http://216.106.187.220` (routes under `/v1`).

---

## 2) Architecture decisions (already made)

| Decision | Choice |
|---|---|
| Rendering | **SPA / CSR** (client components hit the API directly) |
| Backend base URL | `http://216.106.187.220` (API under `/v1`) |
| Auth transport | **Bearer token** from OTP verify |
| Token storage | `localStorage` (simple) — wrap access in one module so it can move to a cookie later |
| i18n | Persian default, `X-Locale` header; RTL |
| Deployment | Docker (multi-stage Node build → static/standalone) |

> ⚠️ The backend is currently **plain HTTP** (no TLS). So the frontend in dev must
> also run on **http** (e.g. `http://localhost:3000`), otherwise the browser
> blocks https→http calls (**Mixed Content**, unrelated to CORS). Going to a
> production https domain requires the **backend** to get TLS first. CORS itself
> is already configured on the backend for `/v1/*` (`Access-Control-Allow-Origin: *`).

---

## 3) API conventions

- **Base:** `http://216.106.187.220` — all endpoints below are under **`/v1`**.
- **Headers (always):** `Accept: application/json`, `X-Locale: fa|en`.
  **When authed:** `Authorization: Bearer <token>`. **With a JSON body:**
  `Content-Type: application/json`.
- **Success:** `200` (read/update), `201` (create). Bodies wrap a single resource
  as `{ "data": { … } }` (JsonResource), or are a plain object for ad-hoc
  endpoints (noted per-endpoint). Collections are `{ "data": [ … ] }` **or** a
  domain-specific shape (e.g. `/models` → `{object,data}`, `/wallet` →
  `{credits,transactions}`) — noted per-endpoint.
- **Errors:** always `{ "error": { "message", "type" } }` with an HTTP status.
  Common: `401 invalid_request_error` (bad/missing token), `402
  insufficient_credits`, `403 plan_access_denied`, `404 *_not_found`, `422`
  (validation; Laravel also returns `{message, errors:{field:[…]}}` for field
  validation), `429` (rate limit; `Retry-After` header on OTP).

**Suggested typed client:**
```ts
const BASE = "http://216.106.187.220/v1";
async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken(); // from auth store
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      Accept: "application/json",
      "X-Locale": getLocale(),                 // "fa" | "en"
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  const json = res.status === 204 ? null : await res.json();
  if (!res.ok) throw json?.error ?? { message: "Network error", type: "network" };
  return json as T;
}
```

---

## 4) Endpoint reference

### 4.1 Auth (public, rate-limited 6/min)

**`POST /v1/auth/otp/request`** — send an OTP code.
```jsonc
// body
{ "phone": "09123456789" }
// 200
{ "message": "..." }
// errors: 422 invalid_phone · 429 otp_throttled (+ Retry-After header)
```

**`POST /v1/auth/otp/verify`** — verify code, get token. **Login = register**
(creates the user on first verify, with a welcome credit bonus).
```jsonc
// body
{ "phone": "09123456789", "code": "1234" }
// 200
{ "token": "sk_...", "token_type": "Bearer" }
// errors: 422 invalid_code
```
> **Dev:** outside production the code **`4444`** always works (no real SMS).

**`POST /v1/auth/logout`** *(auth)* — revokes the current token. → `200`.

### 4.2 Profile

**`GET /v1/me`** *(auth)* → `200`
```jsonc
{ "data": {
  "id": 1, "name": "...", "phone": "0912...", "role": "user",
  "locale": "fa", "profession": "پزشک",          // profession nullable
  "credits": 100.0,
  "plan": { "level": 0, "name": null, "expires_at": null }  // name/expires null when no active plan
}}
```

**`PATCH /v1/me`** *(auth)* — partial update; only send fields you change.
```jsonc
// body (all optional)
{ "name": "...", "profession": "پزشک", "locale": "fa" }  // profession:null clears it
// 200 → same shape as GET /v1/me
// errors: 422 (name>100 chars, or locale not in fa|en)
```

### 4.3 Models (catalog)

**`GET /v1/models`** *(auth)* → `200`
```jsonc
{ "object": "list", "data": [
  { "id": "gpt-5-5", "object": "model", "owned_by": "hooshinu",
    "name": "GPT 5.5", "category": "text",          // text|image|video|audio
    "unit": "per_token", "price": 0.002,            // per-unit credit estimate
    "min_plan_level": 0,
    "locked": false,                                // true → caller's plan too low
    "schema": [ /* dynamic input fields for media models; see §6.3 */ ] }
]}
```
Use `category === "text"` for the chat model picker; the rest for the studio.
`locked` → show a lock/upsell. `schema` drives the media generation form.

### 4.4 Chat — persisted conversations *(non-streaming)*

> These store history and **return the full reply** (no streaming). For a live
> token-by-token experience use the streaming endpoint in §5 instead.

**`GET /v1/conversations`** *(auth)* → `200` `{ "data": [ {id,title,model,created_at,updated_at} ] }`

**`POST /v1/conversations`** *(auth)* — start an empty conversation.
```jsonc
{ "model": "gpt-5-5", "title": "اختیاری" }     // model = a text model slug
// 201 → { "data": { id, title, model, created_at, updated_at } }
// errors: 404 model_not_found
```

**`GET /v1/conversations/{id}`** *(auth)* → `200` `{ "data": { …, "messages": [ {id,role,content,created_at} ] } }`
(`role` = `user|assistant|system`). 404 if not yours.

**`POST /v1/conversations/{id}/messages`** *(auth)* — append a user message and
get the assistant reply (full, non-streamed).
```jsonc
{ "content": "سلام" }                            // max 8000 chars
// 201 → { "data": { id, role:"assistant", content, created_at } }
// errors: 402 insufficient_credits · 404 (not yours)
```

### 4.5 Chat — OpenAI-compatible *(supports streaming — see §5)*

**`POST /v1/chat/completions`** *(auth)* — stateless (not persisted).
```jsonc
{ "model": "gpt-5-5",
  "messages": [ { "role": "user", "content": "سلام" } ],
  "stream": false,                               // true → SSE, see §5
  "web_search": false,                           // optional
  "reasoning_effort": "low" }                    // optional: low|medium|high|xhigh
// 200 (non-stream) → OpenAI shape:
// { id, object:"chat.completion", created, model,
//   choices:[{index,message:{role,content},finish_reason}],
//   usage:{prompt_tokens,completion_tokens,total_tokens} }
// errors: 402 insufficient_credits · 403 plan_access_denied · 404 model_not_found
```
**Vision:** `content` may be a string OR an OpenAI multi-part array for image
input:
```jsonc
"content": [
  { "type": "text", "text": "این تصویر چیست؟" },
  { "type": "image_url", "image_url": { "url": "https://.../img.jpg" } }
]
```

### 4.6 Media generation (image/video/audio — async)

**`POST /v1/generations`** *(auth)* — start a job.
```jsonc
{ "model": "google/nano-banana",
  "input": { "prompt": "یک گربه فضانورد" } }     // keys come from the model's `schema`
// 201 → GenerationTask (see below). status starts pending/queued.
// errors: 402 insufficient_credits · 404 model_not_found · 422 invalid_model (text model)
```
**`GET /v1/generations`** *(auth)* → `200` `{ "data": [ GenerationTask ] }`
**`GET /v1/generations/{id}`** *(auth)* → `200` `{ "data": GenerationTask }` — **poll this** until status is terminal.
```jsonc
// GenerationTask
{ "id": 1, "model": "google/nano-banana", "category": "image",
  "status": "pending",                           // pending|queued|processing|success|failed
  "input": { "prompt": "..." },
  "results": [ "https://.../result.png" ],       // populated on success
  "credits_cost": 0.5,                           // null until charged
  "fail_reason": null, "created_at": "..." }
```
> No push channel for the SPA — **poll** `GET /v1/generations/{id}` (e.g. every
> 2–3s) while status ∈ {pending, queued, processing}.

### 4.7 Wallet, payments, plans

**`GET /v1/wallet`** *(auth)* → `200`
```jsonc
{ "credits": 100.0,
  "transactions": [ { id, type, credits, balance_after, reference, created_at } ] }
// type: topup|usage|refund|bonus
```

**`POST /v1/payments`** *(auth)* — start a wallet top-up (Toman).
```jsonc
{ "amount": 50000 }                              // integer Toman, min 1000
// 201 → { "redirect_url": "https://.../pay" }   // redirect the user there
```
**`GET /v1/payments`** *(auth)* → `200` `{ "data": [ {id,amount_toman,credits,status,created_at} ] }` (`status`: pending|paid|failed)

**`GET /v1/plans`** *(auth)* → `200` `{ "data": [ {id,slug,name,price_toman,credits,level,duration_days} ] }`

**`POST /v1/plans/{plan}/purchase`** *(auth)* — buy a subscription (by plan id).
```jsonc
// 201 → { "redirect_url": "https://.../pay" }
// errors: 404 plan_unavailable
```
> **Payment is redirect-based** (currently Zarinpal). Open `redirect_url`; after
> payment the user returns to the backend callback. The SPA should, on return,
> re-fetch `/v1/wallet` and `/v1/me` to reflect the new balance/plan. (A Bazaar
> in-app billing path is planned but **not implemented yet** — don't build for it.)

### 4.8 API keys (optional "developer" settings screen)

**`GET /v1/api-keys`** *(auth)* → `{ "data": [ {id,name,prefix,revoked,last_used_at,created_at} ] }`
**`POST /v1/api-keys`** `{ "name": "..." }` → `201` — **token shown once**:
```jsonc
{ "data": { id, name, prefix, ... }, "token": "sk_..." }   // store/copy now; never returned again
```
**`DELETE /v1/api-keys/{id}`** *(auth)* → revokes. 404 if not yours.

---

## 5) Streaming chat (SSE) — read carefully

There are **two streaming paths**, both stateless (no server history), and both
produce the **same SSE wire format**. Pick by capacity needs:

| Path | Use when | Caveat |
|---|---|---|
| **A — Relay-backed** (recommended): `POST /v1/chat/stream/prepare` → token → `GET /relay/stream?token=…` | Production / high concurrent users. Doesn't pin PHP workers. | Requires the relay to be configured on the backend; returns **503** otherwise (fall back to B). |
| **B — Direct SSE**: `POST /v1/chat/completions` with `"stream": true` | Dev, MVP, or when the relay is disabled. | Each active stream holds an Octane worker for the whole reply — caps concurrency at ~the worker count. |

**Wire format** (both paths emit identical SSE: a sequence of
`data: <chat.completion.chunk>` lines ending with `data: [DONE]`):
```jsonc
data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}
data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"سلام"},"finish_reason":null}]}
data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}
data: [DONE]
```

### 5.A) Path A — Relay-backed (preferred)

**Step 1 — Prepare** (Bearer auth):
```jsonc
// POST /v1/chat/stream/prepare
{ "model": "gpt-5-5",
  "messages": [ { "role": "user", "content": "سلام" } ],
  "web_search": false,
  "reasoning_effort": "low" }
// 200 → { "token": "..." }              // short-lived (~60s)
// 402 insufficient_credits · 403 plan_access_denied · 404 model_not_found
// 503 relay_disabled → fall back to Path B
```

**Step 2 — Connect** to the relay (no Bearer header here — the token authorizes
the connection):
```ts
const prep = await api<{ token: string }>("/chat/stream/prepare", {
  method: "POST", body: JSON.stringify({ model, messages /*, web_search, reasoning_effort */ }),
});
// Use an ABSOLUTE URL on the backend origin (RELAY_BASE), not a relative path.
const res = await fetch(`${RELAY_BASE}/relay/stream?token=${encodeURIComponent(prep.token)}`, {
  headers: { Accept: "text/event-stream" },
});
await readSSE(res, appendToUI);   // see readSSE below — same reader for both paths
```

> ⚠️ **Use an absolute URL for the relay (origin matters).** The relay lives at
> the backend ROOT (`/relay/stream`), not under `/v1`. A *relative*
> `/relay/stream` resolves against the SPA's own origin — fine in production when
> the SPA sits behind the same nginx (same-origin), but in dev the SPA runs on a
> different origin (e.g. `http://localhost:3000`) so the relative path hits the
> Next dev server and 404s. Call it with an absolute URL on the backend origin:
> `RELAY_BASE = NEXT_PUBLIC_API_BASE` minus the trailing `/v1` (override with
> `NEXT_PUBLIC_RELAY_BASE`). The same code then works in both dev (cross-origin)
> and prod (same-origin).
>
> Because the dev call is **cross-origin**, nginx must send CORS headers on
> `/relay/*` (already handled for `/v1/*`). Livewire ignores these (it's
> same-origin), so they're harmless there and only help the SPA.

On a `503 relay_disabled` from prepare, immediately fall back to Path B with the
same `messages`. No UX difference for the user.

### 5.B) Path B — Direct SSE fallback

```ts
const res = await fetch(`${BASE}/chat/completions`, {
  method: "POST",
  headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Accept: "text/event-stream" },
  body: JSON.stringify({ model, messages, stream: true }),
});
await readSSE(res, appendToUI);
```

### Shared SSE reader (works for both paths)

```ts
async function readSSE(res: Response, onDelta: (text: string) => void) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) !== -1) {
      const line = buf.slice(0, i).replace(/^data: ?/, "");
      buf = buf.slice(i + 2);
      if (!line || line === "[DONE]") continue;
      const chunk = JSON.parse(line);
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) onDelta(delta);
    }
  }
}
```

> ⚠️ **History is still client-side.** Both paths are **stateless** — the
> server does NOT save the conversation. Keep history in component state /
> localStorage and send prior turns in `messages[]` yourself. A *persisted* +
> streaming endpoint is on the roadmap (see Changelog above) but **not built
> yet** — don't invent one. (If you need server-saved history with no live
> tokens, use `POST /v1/conversations/{id}/messages` — it returns the full
> reply at once.)

---

## 6) Enums & reference values

- **role** (user): `user`, `admin`
- **message role**: `system`, `user`, `assistant`
- **model category**: `text`, `image`, `video`, `audio`
- **pricing unit**: `per_token`, `per_image`, `per_second`, `per_video`, `per_request`
- **generation status**: `pending`, `queued`, `processing`, `success`, `failed`
- **transaction type**: `topup`, `usage`, `refund`, `bonus`
- **payment status**: `pending`, `paid`, `failed`
- **reasoning_effort**: `low`, `medium`, `high`, `xhigh`
- **locales**: `fa` (default, RTL), `en`
- Money is **Toman** (`*_toman`); credits are decimals. Rough display: a model's
  `price` is credits per unit.

### 6.3 Media `schema` field shape (from `GET /v1/models`)
Each media model carries a `schema` array describing its input form. Field
objects look like:
```jsonc
{ "name": "prompt", "label": "...", "type": "textarea", "required": true }
{ "name": "aspect_ratio", "label": "...", "type": "select", "default": "1:1",
  "options": ["1:1","16:9", { "value":"voice_id", "label":"نام" }] }  // options: strings or {value,label}
{ "name": "audio_url", "label": "...", "type": "audio_file" }          // upload → send the resulting URL
```
Render fields generically by `type` (`text|textarea|select|dialogue|audio_file`)
and submit them as the `input` **object** to `POST /v1/generations`.

> **⚠️ Implementation note (observed live, not in the original contract):** the
> live backend wraps the field list in an envelope — `"schema": { "fields": [ … ] }`
> — rather than sending a bare array, and `schema` is `null` for text models. It
> also emits a **`boolean`** field type (e.g. `sound`, `instrumental`) and, for
> `dialogue` fields, carries `voices: [{value,label}]` + `default_voice`, and for
> `audio_file` an `accept` hint. The frontend's `normalizeSchema` unwraps
> `{fields}` (also tolerating a JSON string or an object-map), coerces partial
> fields, and renders `boolean` as a toggle (submitted as a real boolean).

---

## 7) Frontend project structure & Docker

**Suggested structure:**
```
src/
  app/                      # Next App Router (all client components for app screens)
    (auth)/login/
    (app)/chat/ studio/ wallet/ settings/ dashboard/
    layout.tsx              # <html dir="rtl" lang="fa">, providers
  lib/
    api.ts                  # typed fetch wrapper (§3)
    auth.ts                 # token get/set/clear, login state
    sse.ts                  # streaming reader (§5)
    types.ts                # TS types mirroring the contract
  features/
    chat/ studio/ wallet/ models/   # hooks (useQuery/useMutation) + components per domain
  components/ui/            # buttons, inputs, modals (RTL, dark mode)
  styles/
```

**Conventions:** one `useXxx` hook per resource (TanStack Query), keyed by
resource; mutations invalidate the relevant query (e.g. after a message,
invalidate the conversation + wallet). Centralize the base URL in one env var
(`NEXT_PUBLIC_API_BASE=http://216.106.187.220/v1`).

**Docker (multi-stage, standalone):**
```dockerfile
# build
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_PUBLIC_API_BASE=http://216.106.187.220/v1
RUN npm run build
# run (Next standalone output)
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```
Set `output: "standalone"` in `next.config.js`. Add a `.dockerignore`
(`node_modules`, `.next`, `.git`).

---

## 8) Do NOT assume

1. **No streamed+persisted chat endpoint** (see §5). Don't build against one.
2. **Backend is HTTP** — dev frontend must be HTTP too (Mixed Content). HTTPS
   needs backend TLS first (separate task).
3. **Bazaar / in-app payment is not implemented** — only redirect payments exist.
4. **No realtime/websocket for the SPA** — poll for generation status.
5. **OTP `4444`** only works in non-production.
6. CORS is already open for `/v1/*`; if you hit CORS errors you're probably
   calling a non-`/v1` path or the backend wasn't redeployed.
7. Error shape is **always** `{error:{message,type}}` (except Laravel field
   validation which adds `{message, errors}`); handle both.

---

## 9) Suggested screens / flows

1. **Login** — phone → request OTP → enter code → verify → store token → go to app.
2. **Chat** — model picker (text models from `/v1/models`), message list, composer
   with optional image attach (vision), streaming reply via §5; web_search +
   reasoning toggles. (Decide per §5 whether to persist or stream.)
3. **Studio** — pick a media model, render its `schema` as a form, `POST
   /v1/generations`, poll status, show `results` (images/video/audio).
4. **Wallet** — balance, transactions, top-up (amount → `redirect_url`), plans
   list + purchase. On return from payment, refetch wallet/me.
5. **Settings** — edit profile (`PATCH /v1/me`: name, profession, locale),
   API keys management, theme/locale toggle, logout.
6. **Dashboard** — credits, active plan badge, recent generations/conversations.

---

## 10) First actions for the new session

1. Scaffold Next.js (App Router, TS, Tailwind v4) with `output: "standalone"`,
   RTL `<html dir="rtl" lang="fa">`, dark mode, Vazirmatn font.
2. Add `lib/api.ts` (§3), `lib/auth.ts`, `lib/sse.ts` (§5), `lib/types.ts`.
3. Build the **login/OTP** flow end-to-end against the real backend (dev code
   `4444`), confirm you receive and store the Bearer token, and that `GET
   /v1/me` works.
4. Then chat → studio → wallet → settings, per §9.
5. Add the Dockerfile (§7).

Build incrementally, keep components small and typed, RTL + dark mode from the
start. When something about the backend is ambiguous, prefer this contract; if it
contradicts reality, check `http://216.106.187.220/docs/api.json` and ask.
