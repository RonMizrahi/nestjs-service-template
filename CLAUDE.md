# nestjs-service-template

Production-grade NestJS 11 service template — the Node/TypeScript mirror of
[spring-service-template](https://github.com/RonMizrahi/spring-service-template): latest-stack,
deprecation-free, decorator-heavy, short. **Now a Turborepo monorepo (pnpm):** the service lives in
`apps/service`, a thin React SPA in `apps/web`, shared config + a generated API client in `packages/*`.

## Monorepo layout

```
apps/
  service/   # the NestJS 11 service (all backend code, tests, Dockerfile, data-source.ts)
  web/       # thin Vite + React 19 + Tailwind v4 SPA — calls a few endpoints via @repo/api-client
packages/
  api-client/        # openapi-fetch client + types GENERATED from the service OpenAPI spec
  eslint-config/     # shared flat config (base / node / react variants)
  typescript-config/ # shared tsconfig bases (base / nest / react)
turbo.json · pnpm-workspace.yaml
```

## Stack

- **Backend (apps/service):** NestJS 11 / Express 5 / Node 24 LTS / TypeScript
- **Frontend (apps/web):** Vite 8 + React 19 + Tailwind v4 (no shadcn); React Router v7; openapi-fetch
- **Monorepo:** pnpm workspaces + Turborepo (content-hash caching, local + GitHub Actions cache)
- **Data:** TypeORM 1.0 + Postgres (`synchronize:false`, migrations via `apps/service/data-source.ts`)
- **Cache:** @nestjs/cache-manager v3 + Keyv + @keyv/redis (TTL in **ms**, miss returns **undefined**)
- **Auth:** @nestjs/jwt + passport-jwt + argon2id; global JwtAuthGuard + `@Public()`; authz via `@Roles()`+RolesGuard and `@RequirePermissions()`+PermissionsGuard (`permissions` derived from roles at token issuance)
- **Messaging:** pluggable `MESSAGE_BUS` — Kafka / SQS, switched by `MESSAGING_DRIVER`
- **Resilience:** cockatiel; HTTP via @nestjs/axios
- **Observability:** OTel (OTLP→Jaeger v2, preloaded `src/tracing.ts`), Prometheus `/metrics`, nestjs-pino
- **Health:** Terminus — `/health/liveness` + `/health/readiness`. **Rate limit:** @nestjs/throttler v6

## Commands (from repo root)

```bash
pnpm install                              # bootstrap the workspace
pnpm turbo run lint typecheck test build  # all packages, cache-aware
pnpm turbo run test:int                   # service integration tests (Testcontainers — Docker required)
pnpm turbo run e2e --filter=web           # SPA Playwright e2e (hermetic — mocks the API)
pnpm --filter service start:dev           # service watch mode
pnpm --filter service generate:openapi    # refresh packages/api-client/openapi.json (preview mode, no DB)
pnpm --filter web dev                     # SPA dev server (:5173)
pnpm --filter service run migration:generate -- src/migrations/<Name>   # TypeORM CLI (-d data-source.ts)
docker compose up                         # full dev stack (postgres, redis, kafka, localstack, jaeger)
```

## apps/service structure

```
src/  config/ common/ auth/ users/ cache/ health/ messaging/ external/ observability/
src/tracing.ts     # OTel bootstrap — MUST load before Nest (node --require)
src/app.setup.ts   # configureApp + buildOpenApiDocument (shared by main.ts + generate-openapi.ts)
data-source.ts     # standalone DataSource for the TypeORM CLI
```

## Conventions (enforced by user skills — load them before editing)

- `nestjs-backend-standards` — repository pattern, DTO classes, ValidationPipe, no `any`, current TypeORM APIs, JSDoc ≤3 lines + full Swagger.
- `testing-standards` — service: unit alongside code + Testcontainers integration, **no backend e2e**. `apps/web` uses **Playwright e2e** (the one place e2e lives). Every endpoint ≥1 happy-path; random UUIDs.
- `front-react-development` — load before ANY apps/web React work (routes to current specialist skills).
- `nestjs-logging` — nestjs-pino, metadata-first, `{ err }`, no PII/secrets.
- Plans/reviews/reports → `docs/<subject>/<name>-<DD>-<MM>-<YYYY>-<type>.md`.

## Key gotchas (verified July 2026)

- **pnpm 11 build approval:** native/postinstall deps (argon2, ssh2, cpu-features, unrs-resolver, protobufjs) are approved via the `allowBuilds:` map (booleans) in `pnpm-workspace.yaml` — not the old `onlyBuiltDependencies` list.
- **cockatiel is ESM-only + pnpm:** both Jest configs whitelist it via `node_modules/\.pnpm/(?!cockatiel@)` (pnpm's `.pnpm/` nesting defeats the classic `node_modules/(?!cockatiel)` pattern).
- **generate:openapi** boots Nest in **preview mode** (`{ preview: true }`) → no DB/Redis/Kafka connect; it re-applies URI versioning so paths match runtime (`/v1/...`; health version-neutral). `openapi.json` + `schema.d.ts` are committed, so `api-client#build` is hermetic.
- **@repo/api-client is source-exported** (`exports: ./src/index.ts`) — Vite consumes the TS directly; build only regenerates types.
- Old cache stores deprecated — Keyv only. `HttpModule` from `@nestjs/common` deprecated → @nestjs/axios. OTel exporters → OTLP. Redis throttler = `@nest-lab/throttler-storage-redis`. SQS is not a built-in transport.
- **Hybrid app (HTTP + Kafka):** every HTTP-assuming global guard/filter checks `context.getType() !== 'http'` — new ones must too or Kafka consumers crash.
- `OTEL_ENABLED` accepts only literal `true`/`false`. Raw `Keyv` providers get no Nest lifecycle — disconnect in `onApplicationShutdown`.

## Plan history

- `docs/plans/nestjs-service-template-05-07-2026-plan.md` — **COMPLETE** (06-07-2026): base service, 10 milestones, single PR.
- `docs/plans/turbo-monorepo-11-07-2026-plan.md` — **COMPLETE** (11-07-2026): Turborepo migration (relocate → api-client → web → e2e → CI) on `plan/turbo-monorepo`, single PR.
