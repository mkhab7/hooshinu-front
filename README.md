# Hooshinu — Web Client

کلاینت وب پلتفرم هوش مصنوعی **هوشینو** (فارسی‌محور، RTL، دارک‌مود).

A Persian-first (RTL), dark-mode web client for the Hooshinu multi-model AI
platform: chat (streaming), media generation (image/video/audio), credit
wallet, and subscription plans.

## Stack

- **Next.js 15** (App Router) as an SPA/CSR — client components call the backend directly.
- **React 19 + TypeScript**, **Tailwind CSS v4**, RTL-first with full dark mode.
- **TanStack Query** for data fetching + a thin typed `fetch` wrapper.
- **Zustand** for the auth/token store.
- Auth via **Bearer token** (no cookies/sessions).

## Getting started

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE
npm run dev                  # http://localhost:3000  (use HTTP — backend is HTTP)
```

> ⚠️ The backend is plain HTTP, so the dev frontend must also run over **http**
> to avoid Mixed-Content errors. Dev OTP code: **`4444`**.

## Project structure

```
src/
  app/
    login/                  # phone + OTP flow
    (app)/                  # authenticated shell (sidebar)
      dashboard/ chat/ studio/ wallet/ settings/
    layout.tsx              # <html dir="rtl" lang="fa">, providers, Vazirmatn
  lib/
    api.ts                  # typed fetch wrapper
    auth.ts                 # token/locale/theme store
    sse.ts                  # streaming chat reader
    types.ts                # types mirroring the API contract
    utils.ts                # cn + Persian number/date formatting
  features/
    auth/ profile/ models/ conversations/ studio/ wallet/ apikeys/
  components/ui/            # Button, Input, Card, Toast, …
```

## Architecture notes (from the backend contract)

- **Chat** uses the streaming `POST /v1/chat/completions` endpoint with
  client-side history (the streamed endpoint is stateless; there is no
  streamed+persisted endpoint).
- **Media generation** is async: create a job, then **poll**
  `GET /v1/generations/{id}` (no websockets).
- **Payments** are redirect-based (Zarinpal). On return, wallet/profile are refetched.

## Docker

```bash
docker build -t hooshinu-front .
docker run -p 3000:3000 hooshinu-front
```

Uses Next.js `output: "standalone"`.
