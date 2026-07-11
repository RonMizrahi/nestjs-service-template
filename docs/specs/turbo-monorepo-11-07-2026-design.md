# Turborepo Monorepo Migration — Design Spec

> **Status:** Draft for review (brainstorming output — hand to Plan Mode after approval)
> **Date:** 2026-07-11
> **Author:** Ron Mizrahi (with Claude)
> **Supersedes/extends:** `docs/nestjs-service-template-blueprint.md`, `docs/plans/nestjs-service-template-05-07-2026-plan.md` (COMPLETE)

---

## 1. Goal & motivation

Convert the single-app `nestjs-service-template` into a **Turborepo monorepo** so it can serve as
Ron's reusable base for job research (take-homes, interview prep, spikes). The heavy, production-grade
NestJS service becomes a *relocated, unchanged* engine; a **thin React SPA** is added that calls a few
of the existing endpoints, and **Turbo** drives `lint / typecheck / test / build` with content-hash
caching across the workspace.

**Success criteria**

1. `pnpm install` at the root bootstraps the whole workspace.
2. `pnpm turbo run lint typecheck test build` runs every package's task, cache-aware; a change touching
   only `apps/web` does **not** re-run the service's tasks.
3. The existing NestJS service builds, unit-tests, and integration-tests exactly as before, from its new
   `apps/service/` home.
4. `apps/web` (Vite + React 19 + Tailwind v4) logs in against the real API, shows the current profile,
   the health status, and (with an admin token) the user list — all typed via a client **generated from
   the service's OpenAPI doc**.
5. CI is a single Turbo-driven GitHub Actions pipeline with `.turbo` + pnpm-store caching; Playwright
   e2e for `apps/web` runs as its own job.

**Explicit non-goals**

- No change to the service's runtime behaviour, modules, endpoints, or dependencies (pure relocation).
- No Vercel Remote Cache (local + GitHub Actions cache only — keeps the template account-free).
- No SSR / Next.js. `apps/web` is a **client-only SPA**.
- No new backend features to "support" the frontend. The web app consumes what already exists.

---

## 2. Target structure

```
nestjs-service-template/               # repo root = workspace root
  apps/
    service/                           # the ENTIRE existing app, moved here verbatim
      src/ ... test/ ...
      data-source.ts  migrations/  Dockerfile  compose.yaml?  nest-cli.json
      package.json  tsconfig*.json  jest configs
    web/                               # NEW — thin Vite + React 19 SPA
      src/
        main.tsx  App.tsx
        routes/        # login, dashboard (profile + health + users)
        lib/auth.tsx   # AuthContext: token in memory/localStorage, login/logout
      e2e/             # Playwright specs
      index.html  vite.config.ts  playwright.config.ts  package.json  tsconfig.json
  packages/
    typescript-config/                 # base.json, nest.json, react.json — apps extend these
    eslint-config/                     # shared flat config (base + node + react variants)
    api-client/                        # generated types + typed fetch client (@repo/api-client)
      openapi.json                     # emitted from the service (build input)
      src/schema.d.ts                  # openapi-typescript output
      src/index.ts                     # openapi-fetch client factory (baseUrl + auth)
  turbo.json                           # task graph
  pnpm-workspace.yaml                  # packages: apps/*, packages/*
  package.json                         # root: private, workspaces, dev tooling, turbo
  .github/workflows/ci.yml             # Turbo-driven
  docs/ ...
```

**Naming:** workspace packages use the `@repo/*` scope (`@repo/typescript-config`, `@repo/eslint-config`,
`@repo/api-client`) — the Turborepo convention.

**What moves vs. what's new**

- *Moves unchanged* (`git mv` to preserve history): all of `src/`, `test/`, `data-source.ts`,
  `migrations/`, `Dockerfile`, `nest-cli.json`, `scripts/`, the Jest configs, `.env.example`.
- *Splits out of the service*: its `tsconfig*.json` and `eslint.config.mjs` become thin files that
  `extends` the shared `packages/*` configs.
- *New*: `apps/web`, all three `packages/*`, root `turbo.json` + `pnpm-workspace.yaml` + root `package.json`.
- *Open question — `compose.yaml`*: keep at **repo root** (it's the dev stack for the whole workspace:
  postgres, redis, kafka, localstack, jaeger). The service Dockerfile stays in `apps/service/`.
  Compose build context/paths get repointed to `apps/service`.

---

## 3. Package-manager migration (npm → pnpm)

- Add root `pnpm-workspace.yaml` (`packages: ["apps/*", "packages/*"]`).
- Add `"packageManager": "pnpm@11.x"` + `"engines": { "node": ">=24" }` to the root `package.json`.
- Delete `package-lock.json`; generate `pnpm-lock.yaml`.
- Port the existing `overrides.multer` → root `pnpm.overrides` (`"multer": "^2.2.0"`).
- Service dependencies stay in `apps/service/package.json`; only **workspace tooling** (turbo, prettier,
  shared eslint/ts config as devDeps) lives at the root.
- **cockatiel ESM caveat** (from CLAUDE.md) is unaffected — the Jest `transformIgnorePatterns` whitelist
  moves with the service's Jest config. Verify integration tests still pass post-move (Gate).

---

## 4. Shared config packages

### `@repo/typescript-config`
- `base.json` — strict base (target/lib/module resolution shared by all).
- `nest.json` — `extends base`, adds `experimentalDecorators`, `emitDecoratorMetadata`, CommonJS — the
  service's current `tsconfig.json` reduces to `{ "extends": "@repo/typescript-config/nest.json", ... }`.
- `react.json` — `extends base`, adds `jsx: react-jsx`, `moduleResolution: bundler`, DOM libs, `noEmit`.

### `@repo/eslint-config`
- Flat-config (`eslint.config.mjs`) exports: `base`, `node` (the current typescript-eslint setup the
  service uses), and `react` (react-hooks + react-refresh + jsx-a11y for `apps/web`).
- Apps' eslint config becomes a 2-line re-export of the relevant variant.

### `@repo/api-client` — the type-sharing showcase
- **Generation pipeline (file-based, cache-friendly):**
  1. Service gains a `generate:openapi` script: boots the Nest app in-memory (`NestFactory.create`
     without `listen`), builds the Swagger document with the *existing* `DocumentBuilder` from
     `app.setup.ts`, writes `packages/api-client/openapi.json`, exits.
  2. `@repo/api-client` build runs `openapi-typescript openapi.json -o src/schema.d.ts`.
  3. `src/index.ts` wraps [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) into a
     `createApiClient({ baseUrl, getToken })` factory — fully typed paths/params/responses, tiny runtime.
- **Turbo dependency:** `@repo/api-client#build` `dependsOn` `service#generate:openapi`, so types always
  reflect the current backend and the graph rebuilds them only when the service's API surface changes.
- **Consumer:** `apps/web` imports `@repo/api-client`; every call to `/v1/auth/login`, `/v1/auth/me`,
  `/v1/users`, health, is compile-time-checked against the real contract.

---

## 5. The thin web app (`apps/web`)

**Stack:** Vite + React 19 + TypeScript + Tailwind v4 (`@import "tailwindcss"`, `@theme`), **no shadcn**.
Data fetching via `@repo/api-client` (openapi-fetch). Routing via **React Router v7 (library mode)** with
a tiny route set. State: a small `AuthContext` (no Redux/TanStack Query — YAGNI for a thin app; TanStack
Query noted as an optional upgrade).

**Views (2 routes):**
- `/login` — email + password form → `POST /v1/auth/login` → store access token, redirect to `/`.
- `/` (auth-gated dashboard) — three panels:
  - **Profile** — `GET /v1/auth/me` (works for any authenticated user).
  - **Health** — the Terminus liveness/readiness probes (public; a simple green/red status).
  - **Users** — `GET /v1/users`. ⚠️ **Admin-only** on the backend. The panel shows the list for an admin
    token and renders a clear "requires admin role" state (403) otherwise — this is intentional and
    demonstrates the RBAC surface rather than hiding it.

**Auth model (client-side SPA):**
- Bearer token in the `Authorization` header (not cookies) → avoids CORS-credentials complexity.
- Access token held in React state + mirrored to `localStorage` for reload persistence.
  *Tradeoff acknowledged:* localStorage is XSS-readable; acceptable for a local-dev template demo, called
  out in the app README. Refresh-token rotation is **out of scope** for the thin app (documented, not built).
- `CORS_ORIGINS` in `.env` gains the web dev origin (e.g. `http://localhost:5173`). No Nest code change.

**Config:** `VITE_API_BASE_URL` (defaults to `http://localhost:3000`) selects the API target.

---

## 6. Turbo task graph (`turbo.json`)

| Task | Command per package | `dependsOn` | Cached | Notes |
|---|---|---|---|---|
| `build` | service: `nest build` · web: `vite build` · api-client: `openapi-typescript` | `^build`, (api-client ← `service#generate:openapi`) | ✅ | outputs: `dist/**`, `build/**` |
| `generate:openapi` | service only | — | ✅ | output: `packages/api-client/openapi.json` |
| `typecheck` | `tsc --noEmit` (new script in every package) | `^build` | ✅ | new per-package script |
| `lint` | service/web: `eslint .` | — | ✅ | |
| `test` | service: `jest` (unit) · web: none (or Vitest later) | `^build` | ✅ | |
| `test:int` | service: `jest --config test/jest-int.json` (Testcontainers) | `^build` | ❌ `cache:false` | needs Docker; non-deterministic |
| `e2e` | web: `playwright test` | `build` | ❌ `cache:false` | see §7 |

`globalDependencies`: root `tsconfig`/eslint config, `.env.example`. Environment inputs (`VITE_*`,
`CORS_ORIGINS`, etc.) declared in `turbo.json` `env`/`globalEnv` so cache keys are correct.

---

## 7. Testing

**Service (unchanged):** Jest unit (`test`) + Testcontainers integration (`test:int`). Still
**no backend e2e** — the "backend-only, no Playwright" rule is preserved *for the service*.

**Web:** Per the decision, `apps/web` gets **Playwright e2e** (this is the one place e2e now lives).
- Specs: login happy-path, auth-gated redirect, health panel renders, users-panel 403 state.
- **Hermetic by default:** Playwright intercepts API routes (or MSW) so e2e runs without a live backend —
  fast, deterministic, CI-friendly. A documented opt-in mode runs against a real service via
  `docker compose up service` for full-stack verification.
- No unit/component tests for the thin app initially (`turbo run test` is a no-op for web); Vitest noted
  as an easy future add if the UI grows.

This **updates the template's testing convention**: e2e (Playwright) is now permitted, scoped to
`apps/web` only. Recorded in §9.

---

## 8. CI/CD

Replace the single npm job with a Turbo-driven pipeline (`.github/workflows/ci.yml`):

- `setup-node@24` + `pnpm/action-setup` + pnpm-store cache + `.turbo` cache via `actions/cache`
  (keyed on lockfile + turbo hash).
- **Job `verify`:** `pnpm install --frozen-lockfile` → `pnpm turbo run lint typecheck test build` (one
  graph, cache-aware). Docker is preinstalled on `ubuntu-latest`, so `test:int` (Testcontainers) runs
  here too, after build.
- **Job `e2e`:** `pnpm turbo run e2e --filter=web` with `playwright install --with-deps`. Separate job so
  browser setup doesn't slow the main verify path.
- Keep the service's existing Docker image build (path repointed to `apps/service`), unchanged in intent.

*Rationale for local+Actions cache over Vercel Remote Cache:* the template stays self-contained and
secret-free; a solo/interview repo doesn't need cross-machine cache sharing.

---

## 9. Docs / CLAUDE.md updates (part of the work)

- **Root `CLAUDE.md`:** document the monorepo layout, pnpm, Turbo commands (`pnpm turbo run …`), and that
  the service now lives in `apps/service`. Add an `apps/web` section (stack, `VITE_*` env, run commands).
- Amend the testing convention line: *"backend-only, no Playwright e2e"* → *"service is backend-only
  (no e2e); `apps/web` uses Playwright e2e."*
- Consider a per-app `apps/web/CLAUDE.md` and `apps/service/CLAUDE.md` (or keep one root file) — decide
  during planning.
- Update `README.md` root with the monorepo quick-start.

---

## 10. Migration approach (why big-bang relocation)

Two approaches were considered:

- **A — Big-bang relocation (chosen).** Move the whole service into `apps/service` in one milestone,
  stand up the workspace + shared configs, verify parity (build/lint/test/int all green), *then* add
  `apps/web` and `@repo/api-client`. Cleanest history for a template; single developer; no long period of
  half-migrated tooling. The service is a black box that either passes its existing gates or doesn't.
- **B — Incremental (rejected).** Keep the app at root, add `apps/web` beside it, migrate tooling later.
  Leaves two config regimes coexisting, muddies Turbo's graph, and offers no benefit for a solo template.

## 11. Proposed milestones (for Plan Mode)

1. **Workspace skeleton** — pnpm workspace, root `package.json`, `turbo.json`, `packages/typescript-config`,
   `packages/eslint-config`. Verify: `pnpm install` + empty `turbo run lint` graph resolves.
2. **Relocate the service** — `git mv` app into `apps/service`; repoint its tsconfig/eslint to `@repo/*`;
   add `typecheck` script; repoint compose/Docker paths. **Gate:** `turbo run lint typecheck test test:int build`
   all green (full parity with pre-migration).
3. **`@repo/api-client`** — `generate:openapi` script in the service; openapi-typescript + openapi-fetch
   client; Turbo dep wiring. Verify: `turbo run build` regenerates types from the live schema.
4. **`apps/web`** — Vite + React 19 + Tailwind v4 scaffold; AuthContext; login + dashboard (profile /
   health / users) via `@repo/api-client`. Verify: manual login against a locally-running service.
5. **Playwright e2e** — hermetic specs (§7). Verify: `turbo run e2e --filter=web` green.
6. **CI + docs close-out** — Turbo-driven `ci.yml` with caching; CLAUDE.md/README updates; Gate B holistic
   review; single PR.

Each milestone follows the standard branch → implement → tests → code-quality-pipeline (Gate A) → MR flow.

## 12. Risks & open questions

- **Admin-only users endpoint:** the demo's "list users" panel needs an admin token. Plan should decide
  whether to (a) just document logging in as a seeded admin, or (b) add a tiny dev seed. *Recommendation:
  (a)* — no backend changes.
- **`generate:openapi` bootstrapping** the Nest app may pull in DB/Redis providers. Mitigation: build the
  Swagger document from a lightweight app context, or stub external connections during generation. Confirm
  in milestone 3.
- **cockatiel ESM + Jest** transform config must survive the move — explicit check in milestone 2.
- **compose.yaml location** (root vs `apps/service`) — recommended root; finalize in milestone 2.
- **Playwright vs the no-e2e ethos** — resolved: e2e is scoped to `apps/web` only; service stays e2e-free.

## 13. Out of scope

Refresh-token rotation in the SPA · Vercel Remote Cache · SSR · shadcn/component library · TanStack Query ·
new backend endpoints · deploying `apps/web` anywhere (build only).
