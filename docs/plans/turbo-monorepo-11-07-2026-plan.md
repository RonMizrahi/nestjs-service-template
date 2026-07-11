# Plan — Turborepo Monorepo Migration

> Source spec: `docs/specs/turbo-monorepo-11-07-2026-design.md`
> Plan file (this) will be copied to `docs/plans/turbo-monorepo-11-07-2026-plan.md` before implementation begins.

## Context

`nestjs-service-template` is a single NestJS 11 app at the repo root (npm). The goal is to convert it into a
**Turborepo monorepo** (pnpm workspaces) that Ron reuses as a base for job research: the production-grade service
is relocated **unchanged** into `apps/service/`, a **thin Vite + React 19 SPA** (`apps/web/`) calls a few existing
endpoints through an **OpenAPI-generated typed client** (`packages/api-client`), shared tsconfig/eslint configs move
into `packages/*`, and **Turbo** drives `lint / typecheck / test / build` with content-hash caching. Full rationale,
decisions, and non-goals live in the spec.

## Execution model — SEQUENTIAL (confirmed with user)

Invoked via `/batch`, but the six milestones form a strict dependency chain with heavy shared state (root
`package.json`/`turbo.json`, a whole-repo `git mv`). **User chose plan-guidelines Strategy A:** one side branch
`plan/turbo-monorepo`, milestones run **in order**, Gate A (`code-quality-pipeline`) per milestone, holistic Gate B
before the PR, **single PR** at the end. This matches the repo's established pattern (the original 10-milestone plan
ran the same way). **No parallel worktree workers** — `/batch` Phase 2 is intentionally skipped.

## Research findings that shape the plan

1. **Paths mostly self-correct on relocation** — because the service `package.json` (and its jest block, scripts)
   moves *with* `src/`, `test/`, `data-source.ts`, `nest-cli.json`, `tsconfig*`, most relative refs stay valid
   (`rootDir: src`, `outDir: ./dist`, `coverageDirectory: ../coverage`, `data-source` globs `src/**/*.entity.ts`,
   eslint `tsconfigRootDir: import.meta.dirname`, `test/jest-int.json` `rootDir: .`). Migration CLI scripts stay
   `-d data-source.ts` **as long as they live in `apps/service/package.json`**.
2. **Real repointing is narrow:** extract shared `tsconfig`/`eslint` bases; fix `compose.yaml` (`build: .` →
   `context: ./apps/service`, volume `./scripts/localstack-init.sh` → `./apps/service/scripts/localstack-init.sh`);
   rework the **Dockerfile** for pnpm+workspace.
3. **`generate:openapi` needs Postgres if it boots the full app** (`TypeOrmModule.forRootAsync` + `migrationsRun:true`
   connect at init; `MESSAGING_DRIVER` defaults to `none` so no Kafka; Redis optional). `SwaggerModule.createDocument`
   itself needs only DI metadata. → **Commit generated artifacts; hermetic `api-client#build`; on-demand refresh.**
4. **`CORS_ORIGINS` defaults to `*`** → Bearer-token SPA works in dev with no Nest change (optionally tighten later).
5. **cockatiel ESM** Jest transform (`transformIgnorePatterns: node_modules[/\\](?!cockatiel[/\\])`) lives in the
   service jest configs and moves with them — re-verify `test:int` post-move.

## Refinements to the spec (decided during planning)

- **api-client build is hermetic & artifacts are committed.** `packages/api-client/{openapi.json, src/schema.d.ts}`
  are checked in. `api-client#build` = `openapi-typescript ./openapi.json -o ./src/schema.d.ts` (no `service#…` edge
  in the Turbo graph). `service#generate:openapi` is a **manual/on-demand** refresh, not part of `turbo run build`.
- **generate:openapi implementation** (milestone 3, the one real spike): primary = boot the app with a
  **non-connecting DataSource override** (reuse `@nestjs/testing` `overrideProvider` or a gen-only Nest context) so
  no live Postgres is needed; **fallback** = `curl http://localhost:3000/docs/json` from a running service. Either way
  the output is `packages/api-client/openapi.json`. Choose during the milestone; document whichever ships.
- **Dockerfile** → `turbo prune service --docker` pattern (root build context, workspace-aware pnpm install), keeping
  the existing multi-stage `node:24-alpine` + `nonroot` + `--require ./dist/tracing` preload intent.

---

## Milestones (sequential, on `plan/turbo-monorepo`)

### M1 — Workspace skeleton
Stand up the monorepo scaffolding with **no app moved yet**.
- **Steps / files:**
  - Root `pnpm-workspace.yaml` (`packages: ["apps/*", "packages/*"]`), root `package.json` (private; `packageManager: pnpm@11.x`; `engines.node >=24`; `pnpm.overrides.multer: ^2.2.0`; devDeps: `turbo`, `prettier`, `typescript`), root `turbo.json` (tasks: `build`, `typecheck`, `lint`, `test`, `test:int` `cache:false`, `e2e` `cache:false`; `globalDependencies`, `env`/`globalEnv` for `VITE_*`/`CORS_ORIGINS`). Move `.prettierrc` semantics to root.
  - `packages/typescript-config/` — `base.json` (from the current root tsconfig compilerOptions), `nest.json` (extends base; decorators/CommonJS), `react.json` (extends base; `jsx: react-jsx`, `moduleResolution: bundler`, DOM libs, `noEmit`). `package.json` name `@repo/typescript-config`.
  - `packages/eslint-config/` — flat-config exporting `base`, `node` (current `js.recommended` + `tseslint.recommendedTypeChecked` + the two custom rules), `react` (react-hooks + react-refresh + jsx-a11y). `package.json` name `@repo/eslint-config`.
- **Tests (testing-standards):** no app logic yet — verification is structural (`pnpm install` resolves; `pnpm turbo run lint` resolves an empty/again no-op graph). No unit tests for config packages.
- **Gate A:** run `code-quality-pipeline` on the new config files.
- **Verify:** `pnpm install` succeeds; `pnpm turbo run build --dry` shows the (empty) task graph.

### M2 — Relocate the service → `apps/service/` (parity gate)
Move the entire app and repoint the narrow set of broken paths. **Behavior unchanged.**
- **Steps / files:**
  - `git mv` into `apps/service/`: `src/`, `test/`, `migrations/` (already under src? keep as-is), `data-source.ts`, `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.mjs`, `package.json`, `Dockerfile`, `.dockerignore`, `scripts/`, `.env.example`.
  - `apps/service/tsconfig.json` → `extends @repo/typescript-config/nest.json` + local `outDir`/`baseUrl`. `tsconfig.build.json` stays local (its excludes are service-specific), extends the local tsconfig.
  - `apps/service/eslint.config.mjs` → import the `node` variant from `@repo/eslint-config`, keep `tsconfigRootDir: import.meta.dirname` + `ignores`.
  - `apps/service/package.json`: add `@repo/typescript-config` + `@repo/eslint-config` as `devDependencies` (`workspace:*`); add `typecheck` script (`tsc --noEmit -p tsconfig.json`); keep `build/lint/test/test:int/migration:*` (paths stay relative). Remove the npm `overrides` (moved to root `pnpm.overrides`).
  - Root `compose.yaml`: `app.build` → `{ context: ./apps/service, dockerfile: ./Dockerfile }`; localstack volume → `./apps/service/scripts/localstack-init.sh`.
  - Rework `apps/service/Dockerfile` to the `turbo prune`/pnpm-workspace pattern (root context), preserving alpine+nonroot+tracing preload.
  - Delete root `package-lock.json`; regenerate `pnpm-lock.yaml`.
- **Tests (testing-standards):** no new tests — the **existing** unit + integration suites are the parity oracle. Re-run them from the new location; fix only path/config breakage, never behavior.
- **Gate A:** `code-quality-pipeline` on the diff (mostly moves + config).
- **Gate / Verify (full parity):** `pnpm turbo run lint typecheck test test:int build` **all green** (Docker required for `test:int`). `docker compose build app` succeeds (or defer image build validation to M6 if Docker-in-loop is slow — note it).

### M3 — `packages/api-client` (OpenAPI → typed client)
- **Steps / files:**
  - `apps/service`: add `generate:openapi` script → writes `../../packages/api-client/openapi.json` (implementation per the refinement above; resolve the DataSource-override-vs-curl fork here).
  - `packages/api-client/`: `package.json` (`@repo/api-client`, deps `openapi-fetch`, devDep `openapi-typescript`), committed `openapi.json`, `build` = `openapi-typescript ./openapi.json -o ./src/schema.d.ts`, `typecheck`, and `src/index.ts` exporting `createApiClient({ baseUrl, getToken })` wrapping `openapi-fetch` (typed paths for `/v1/auth/login`, `/v1/auth/me`, `/v1/users`, health).
  - Turbo: ensure `build`/`typecheck` wired; **no** `service#generate:openapi` edge (hermetic).
- **Tests (testing-standards):** a tiny unit test for `createApiClient` (attaches `Authorization: Bearer <token>` header; picks up `baseUrl`) — mock fetch, no network.
- **Gate A:** `code-quality-pipeline`.
- **Verify:** run `generate:openapi` against the dev stack → `openapi.json` refreshes; `pnpm turbo run build --filter=@repo/api-client` regenerates `schema.d.ts`; `tsc` sees the typed paths.

### M4 — `apps/web` (thin React SPA)
- **Steps / files:** `apps/web/` — Vite + React 19 + TS + Tailwind v4 (`@import "tailwindcss"` + `@theme`), **no shadcn**. `package.json` deps: `react`, `react-dom`, `react-router-dom` (v7 library mode), `@repo/api-client` (`workspace:*`); scripts `dev`/`build`/`lint`/`typecheck`/`e2e`. `tsconfig.json` extends `@repo/typescript-config/react.json`; `eslint.config.mjs` uses the `react` variant. `vite.config.ts`; `index.html`.
  - `src/lib/auth.tsx` — `AuthContext` (access token in state + `localStorage` mirror; `login()`/`logout()`; `getToken()` fed to `createApiClient`).
  - `src/routes/login.tsx` — email+password form → `POST /v1/auth/login` → store token → redirect `/`.
  - `src/routes/dashboard.tsx` (auth-gated) — three panels: **Profile** (`GET /v1/auth/me`), **Health** (Terminus probes; green/red), **Users** (`GET /v1/users`; renders the list for an admin token and a clear "requires admin role" 403 state otherwise).
  - Config: `VITE_API_BASE_URL` (default `http://localhost:3000`). Add the web dev origin to `.env.example` `CORS_ORIGINS` note (default `*` already works).
- **Tests (testing-standards):** UI app — component/unit tests are optional/minimal; the acceptance coverage is the M5 Playwright e2e (per the spec decision, `turbo run test` is a no-op for web initially). Follow `front-react-development` (React 19 patterns) when writing components.
- **Gate A:** `code-quality-pipeline` (+ `front-react-development` review lens for the React code).
- **Verify:** dev stack up (`docker compose up postgres redis` + `pnpm --filter service start:dev`), `pnpm --filter web dev` → log in, see Profile + Health populate, Users shows list-or-403.

### M5 — Playwright e2e for `apps/web` (hermetic)
- **Steps / files:** `apps/web/playwright.config.ts`; `apps/web/e2e/` specs — login happy-path, auth-gated redirect (unauth → `/login`), health panel renders, users-panel 403 state. **Hermetic:** Playwright route-intercepts (or MSW) the API so no live backend is needed. Document the opt-in live mode (`docker compose up service`). Turbo `e2e` task `cache:false`, `dependsOn: [build]`.
- **Tests:** these specs *are* the tests (this is the one place e2e lives now).
- **Gate A:** `code-quality-pipeline`.
- **Verify:** `pnpm turbo run e2e --filter=web` green (with `playwright install`).

### M6 — CI + docs + close-out (Gate B + single PR)
- **Steps / files:**
  - `.github/workflows/ci.yml` — replace the npm job: `pnpm/action-setup` + `setup-node@24` + pnpm-store cache + `.turbo` cache (`actions/cache`); **job `verify`**: `pnpm install --frozen-lockfile` → `pnpm turbo run lint typecheck test build` + `test:int` (Docker preinstalled); **job `e2e`**: `pnpm turbo run e2e --filter=web` with `playwright install --with-deps`. Keep the service image build (repointed).
  - Root `CLAUDE.md` — monorepo layout, pnpm + `pnpm turbo run …` commands, `apps/service` location, `apps/web` section, amend the testing-convention line ("service e2e-free; `apps/web` uses Playwright e2e"). Keep under 100 lines; consider per-app `CLAUDE.md`. Update root `README.md` quick-start.
  - Copy this plan to `docs/plans/turbo-monorepo-11-07-2026-plan.md`.
- **Gate B (holistic):** run `code-quality-pipeline` Gate B on the entire diff vs `main`.
- **PR:** via `pr-mr-prepare` — one PR, `plan/turbo-monorepo` → `main`.

---

## End-to-end verification recipe

- **Service parity (M2, the critical gate):** `pnpm turbo run lint typecheck test test:int build` — all green from `apps/service`, Docker running for Testcontainers. Proves the relocation changed nothing behaviorally.
- **Type-safety loop (M3):** refresh `openapi.json` via `generate:openapi`; `turbo run build --filter=@repo/api-client`; a deliberate contract mismatch in `apps/web` must fail `tsc`.
- **Full-stack manual (M4):** dev stack + `pnpm --filter web dev` → login → panels populate.
- **Automated e2e (M5):** `pnpm turbo run e2e --filter=web` (hermetic).
- **QA handover (Phase 4):** after all milestones merge, assemble the running system (real DB/config) and hand to
  `qa-engineer` — the sole live acceptance pass (probe auth/RBAC on `/v1/users`, boot/config reality, the SPA journeys).
  Gate on its verdict; convert confirmed findings into committed tests.

## Risks & mitigations
- **generate:openapi vs live DB** — de-risked by committing artifacts + hermetic build; the refresh script is the only
  DB/boot-coupled piece and has a curl fallback. Resolve the mechanism in M3.
- **Dockerfile pnpm/workspace rework** — use `turbo prune`; validate `docker compose build app`. May slip to M6 if needed.
- **cockatiel ESM Jest transform** — explicit re-check in M2's `test:int` gate.
- **Admin-only `/v1/users`** — no backend change; the web panel demonstrates the 403/RBAC surface. Document how to
  obtain an admin token (register grants a non-admin role) if a populated list is wanted.

## Close-out (Phase 3, after merge)
Mark milestone/step statuses in the plan file; update root `CLAUDE.md`; run `claude-md-management:claude-md-improver`;
then QA handover (Phase 4) and record the verdict.
