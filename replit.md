# Flux (ScreenshotOS)

A mobile-first AI screenshot intelligence engine. Flux automatically processes screenshots, extracts actionable data, and surfaces it when needed — without the user ever opening the app.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from `$PORT`, typically 8080)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app (Replit)
- `pnpm --filter @workspace/mobile run dev:local` — run Expo locally on your Mac (no Replit env vars needed)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to dev database (dev only)
- `USER_ID=<firebase-uid> pnpm --filter @workspace/api-server run seed` — seed 10 demo screenshots for a user (skips if they already have data)

## Required Environment

- `DATABASE_URL` — Postgres connection string (auto-provided by Replit's built-in PostgreSQL; also available as `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`)
- `PORT` — injected automatically by Replit workflows; hard-required at API startup
- `SESSION_SECRET` — secret for session signing (set in Replit Secrets)
- `FIREBASE_PROJECT_ID` — Firebase project id (`flux-screenshotos`) to enforce per-user JWT auth on screenshot routes. Leave unset for local no-auth dev mode.
- Mobile `EXPO_PUBLIC_FIREBASE_*` — web config from Firebase console / `firebase apps:sdkconfig WEB`. When set, the app shows a login gate and sends `Authorization: Bearer` on API calls.

## Firebase Auth

- **Project:** `flux-screenshotos` ([console](https://console.firebase.google.com/project/flux-screenshotos/authentication))
- **Providers:** Email/password (deployed via `firebase deploy --only auth`)
- **Config files:** `firebase.json`, `.firebaserc` at repo root
- **Secrets:** copy `artifacts/mobile/.env.example` → `.env` and `artifacts/api-server/.env.example` → `.env`, then fill Firebase values (already done locally; `.env` is gitignored)
- **Local dev without auth:** leave all Firebase env vars unset on both mobile and API — mobile skips login, API uses `local-dev` user id

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo 54 / React Native 0.81 (expo-router)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/`)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo React Native mobile app
- `artifacts/api-server/` — Express 5 API server
- `artifacts/mockup-sandbox/` — UI component sandbox (design tool)
- `lib/db/` — Drizzle ORM schema + DB client (source of truth for schema)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `lib/api-zod/` — generated Zod schemas from OpenAPI spec
- `lib/api-client-react/` — generated React Query hooks from OpenAPI spec

## Architecture decisions

- API contract is defined in `lib/api-spec/openapi.yaml`; client hooks and Zod schemas are generated via `pnpm --filter @workspace/api-spec run codegen`. Do not hand-edit generated files in `lib/api-zod/` or `lib/api-client-react/`.
- `@types/react` is pinned to a single version via `pnpm.overrides` in `package.json` to prevent the dual-path type resolution error that arises from expo packages using `19.1.x` while the mockup-sandbox catalog uses `^19.2.0`.

## Product

Flux turns your screenshot library into a searchable, intelligent action engine. Core concept: users already take screenshots — Flux makes those screenshots alive by classifying them, extracting structured data, and surfacing reminders and alerts without any extra effort.

Planned feature tiers:
- **Free**: Basic OCR, searchable screenshot library, tag filtering
- **Premium** ($9.99/mo): Price tracking, calendar sync, promise reminders, unlimited classification
- **Enterprise** ($49/user/mo): Team dashboard, auto-redaction, compliance logging

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any `pnpm install`, restart the `artifacts/mobile: expo` workflow — react-native-reanimated creates a tmp watch directory that gets invalidated and crashes Metro on the first run after package changes.
- `@types/react` override in `package.json > pnpm.overrides` must stay at a single version; removing it causes dual-path TS errors in `mockup-sandbox`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
