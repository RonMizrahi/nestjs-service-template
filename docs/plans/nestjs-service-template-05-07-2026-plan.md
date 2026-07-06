# NestJS Service Template — Implementation Plan (05-07-2026)

> Executes [`docs/nestjs-service-template-blueprint.md`](../nestjs-service-template-blueprint.md) (research-verified stack, July 2026).
> Standards in force: `nestjs-backend-standards` (TypeORM section), `testing-standards`, `nestjs-logging` (§B nestjs-pino), `code-quality-pipeline`, `pr-mr-prepare`.

## Status: COMPLETE (06-07-2026) — all 10 milestones done, Gate B passed, single PR via pr-mr-prepare

## Branching strategy

**A — one side branch for the whole plan** (recommended default; user delegated the choice).
Branch: `plan/nestjs-service-template` off `main`. Every milestone lands as commits on it; **one PR at the end** via `pr-mr-prepare`. Milestones are sequential (each builds on the previous) — no parallel worktrees.

## Key decisions (deltas & environment)

- **HTTP adapter:** Express 5 (Nest 11 default) — Fastify documented as swap.
- **ValidationPipe:** `whitelist: true, forbidNonWhitelisted: false, transform: true` — **`nestjs-backend-standards` overrides the blueprint's `forbidNonWhitelisted: true`** (mandatory skill wins).
- **Repository pattern:** per standards — `users.repository.ts` wraps `@InjectRepository(User)`; services never touch TypeORM directly.
- **Package manager:** npm (pnpm not installed on machine; npm 11 present; Docker uses `npm ci` either way). `packageManager` field omitted rather than pinning a tool the machine lacks.
- **Node 24 LTS** (v24.14.1 installed ✓), TypeScript ~5.9/6.x per Nest 11 peer support, Docker 29 ✓, remote = github.com/RonMizrahi/nestjs-service-template ✓.
- **Testing:** Jest 30 + Supertest (backend-only → **no Playwright e2e**, per testing-standards). Integration tests via Testcontainers (real Postgres/Redis). Random UUIDs for all test entities.
- **Logging:** nestjs-pino (§B pattern — `@InjectPinoLogger`, meta-first args).
- **Docker runtime: `node:24-alpine`** (user decision 06-07-2026, post-Gate-B) — replaces the blueprint's distroless default; both stages Alpine so argon2 loads its musl prebuilds (never build glibc → run musl); nonroot `node` user; shell-based debuggability preferred over distroless's smaller attack surface.

## Milestones

Every milestone ends with: **unit tests green → integration tests green (where applicable) → `code-quality-pipeline` → commit(s) on the plan branch.**

### M1 — Foundation & bootstrap
- [x] Scaffold project: `package.json` (Nest 11 deps), `tsconfig`, `nest-cli.json` (+ swagger CLI plugin), eslint/prettier, `.gitignore`, `.env.example`
- [x] `src/config/env.schema.ts` — Zod schema + `Env` type; `ConfigModule.forRoot({ validate })`
- [x] `src/main.ts` — bufferLogs, pino logger, helmet, CORS (env-driven), URI versioning (`/v1`), global ValidationPipe (per standards), Swagger at `/docs` (+ bearer auth), `enableShutdownHooks`
- [x] `nestjs-pino` LoggerModule (genReqId/correlation-id, redact, pretty in dev only)
- [x] Unit tests: env schema (valid/invalid/defaults) → verify: `npm run test`
- [x] Smoke integration test: app boots → verify: `npm run test:int` (deviation: script named `test:int`, not `test:e2e`; smoke asserts the 404 envelope, Swagger gated by env)
- [x] code-quality-pipeline → commit

### M2 — Common cross-cutting layer
- [x] `common/exceptions/app.exception.ts` — `AppException extends HttpException` + `ResourceNotFoundException`
- [x] `common/filters/` — `HttpExceptionFilter` (@Catch(HttpException), RFC 9457-style envelope + correlationId) and `AllExceptionsFilter` (@Catch(), HttpAdapterHost, 500 without leak); registered via `APP_FILTER`
- [x] `common/interceptors/` — `LoggingInterceptor` (handler timing), `TransformInterceptor` (`{ data }`, opt-in not global), global `ClassSerializerInterceptor`
- [x] `common/decorators/` — `@Public()`, `@Roles()`, `@CurrentUser()`
- [x] `common/pipes/trim.pipe.ts` (globally wired via `APP_PIPE` before ValidationPipe — completed at Gate B)
- [x] Unit tests per filter/interceptor/pipe (happy path + error shape) → verify: `npm run test`
- [x] code-quality-pipeline → commit
- Gate B corrections (close-out): filters + `LoggingInterceptor` moved to `@InjectPinoLogger` metadata-first `{ err }` logging (were the only two `new Logger()` outliers); both filters + `RolesGuard`/`PermissionsGuard` now rethrow/pass-through on non-HTTP contexts (Kafka events crashed inside `switchToHttp()`-based filters otherwise)

### M3 — Persistence (TypeORM + Postgres)
- [x] `TypeOrmModule.forRootAsync` (ConfigService, `autoLoadEntities`, `synchronize:false`)
- [x] `users/entities/user.entity.ts` — uuid PK, unique email, roles enum array, timestamptz audit columns, `@Exclude()` passwordHash
- [x] `users/users.repository.ts` — repository pattern over `@InjectRepository(User)` (`findOneBy`, current APIs only)
- [x] `data-source.ts` + initial migration + npm scripts (`migration:generate/run/revert`)
- [x] Unit tests: repository with mocked TypeORM repo → verify: `npm run test`
- [x] Integration test: repository CRUD against Testcontainers Postgres (random UUID emails) → verify: `npm run test:int`
- [x] code-quality-pipeline → commit

### M4 — Auth & security (JWT, RBAC, argon2, throttler)
- [x] `auth/password.service.ts` — argon2id (OWASP params)
- [x] `auth/auth.service.ts` — register/validateCredentials/issue tokens (`@nestjs/jwt` registerAsync)
- [x] Strategies: `jwt.strategy.ts` (Bearer, no ignoreExpiration), `local.strategy.ts`
- [x] Guards: global `JwtAuthGuard` (APP_GUARD + `@Public()` bypass), `RolesGuard` (getAllAndOverride)
- [x] `auth/auth.controller.ts` — POST /auth/register (Public), POST /auth/login (Public + LocalAuthGuard), GET /auth/me
- [x] `ThrottlerModule` (named tiers, ms via `seconds()`), strict `@Throttle` on login
- [x] Unit tests: password service, auth service, both guards → verify: `npm run test`
- [x] Integration test: register→login→me happy path + 401/403 paths (Testcontainers PG) → verify: `npm run test:int`
- [x] code-quality-pipeline → commit

### M5 — Users domain (worked example)
- [x] DTOs: `create-user.dto.ts`, `update-user.dto.ts` (PartialType from @nestjs/swagger), `user-response.dto.ts`
- [x] `users.service.ts` (business logic over repository) + `users.controller.ts` (v1, full Swagger, @Roles(admin) on destructive routes)
- [x] Unit tests: service (mocked repository), controller (mocked service) → verify: `npm run test`
- [x] Integration test: CRUD happy path + validation 400 + RBAC 403 → verify: `npm run test:int`
- [x] code-quality-pipeline → commit

### M6 — Cache & health
- [x] `CacheModule.registerAsync` — Keyv + `@keyv/redis` stores array, ms TTL
- [x] `cache/app-cache.service.ts` — typed getOrSet/evict via `CACHE_MANAGER`
- [x] `CacheInterceptor` + `@CacheKey/@CacheTTL` on a read endpoint
- [x] `health/` — Terminus: `/health/liveness` (empty) & `/health/readiness` (TypeORM ping + custom Redis indicator via `HealthIndicatorService`), VERSION_NEUTRAL
- [x] Unit tests: cache service (undefined-on-miss semantics), Redis indicator up/down → verify: `npm run test`
- [x] Integration test: health endpoints against Testcontainers Redis+PG → verify: `npm run test:int`
- [x] code-quality-pipeline → commit
- Deviations (verified during Gate A): dedicated `CACHE_PROBE` Keyv with `throwOnErrors` (main cache + keyv/@keyv/redis all swallow errors — probing via `CACHE_MANAGER` would always report up); `CachingModule.onApplicationShutdown` disconnects the probe (raw Keyv providers get no Nest lifecycle — leaked node-redis reconnect loop hung Jest); readiness `down` returns generic `'cache unreachable'` and logs the raw driver error server-side (public endpoint must not leak internal hosts/auth state)

### M7 — Messaging (pluggable Kafka + SQS) + permissions-based authz
- [x] Permissions layer (decision 05-07: claims-based, no external RBAC — zero per-request hops, zero-trust at the service): `Permission` enum + role→permission map applied at **token issuance** (`permissions` claim), `@RequirePermissions()` decorator + `PermissionsGuard` alongside `@Roles()`; changing role→permission mapping = auth-side change only
- [x] Unit tests: permissions guard (allow/deny/missing claim), issuance mapping → verify: `npm run test`
- [x] `messaging/message-bus.ts` — `MESSAGE_BUS` token + `MessageBus` port (publish/ask)
- [x] `messaging/kafka.bus.ts` — ClientKafka wrapper (connect/subscribeToResponseOf lifecycle)
- [x] `messaging/sqs.bus.ts` — @ssut/nestjs-sqs SqsService wrapper (AWS SDK v3)
- [x] Consumers: Kafka `@EventPattern` controller + `@SqsMessageHandler` handler (demo `user.created` event)
- [x] `MessagingModule` — env switch `MESSAGING_DRIVER=kafka|sqs|none`, only selected driver instantiated
- [x] Emit `user.created` from UsersService via the port
- [x] Unit tests: bus selection factory, each bus with mocked client, consumer handlers → verify: `npm run test`
- [x] code-quality-pipeline → commit
- Deviations (verified during Gate A): `ask()` on SQS/none throws `NotImplementedException` (no reply channel); global HTTP guards made context-aware — `JwtAuthGuard` early-returns and `HttpThrottlerGuard` (new, replaces stock `ThrottlerGuard`) passes non-HTTP contexts so Kafka consumers aren't rejected/crashed by `res.header()`; Kafka producer client uses `producerOnlyMode` while `ASK_TOPICS` is empty (a failing consumer group-join must not break publish); SQS handler validates wire payloads with Zod at the boundary; `user.created` publish failures are logged, never fail user creation

### M8 — Resilience & external HTTP
- [x] `external/resilience.ts` — cockatiel wrap(retry+breaker+timeout) built once per dependency
- [x] `external/external-api.service.ts` — @nestjs/axios through the policy, BrokenCircuitError→503
- [x] Demo controller route exposing the external call
- [x] Unit tests: retry/breaker behavior (fake failing fn), 503 mapping → verify: `npm run test`
- [x] code-quality-pipeline → commit
- Deviations (verified during Gate A): policy provided via `EXTERNAL_API_POLICY` token (testable DI, breaker state spans calls); factory takes per-dependency tuning knobs; cooperative timeout's `AbortSignal` is passed into axios so cancellation is real; cockatiel is **ESM-only** — runtime relies on Node ≥24 native `require(esm)` (verified against compiled dist; documented at the import) and both Jest configs transform it to CJS (`transformIgnorePatterns` whitelist + `.js` ts-jest transform); no integration test for the demo route (would hit the live external API — unit-covered with mocked HttpService)

### M9 — Observability (OTel + Prometheus)
- [x] `src/tracing.ts` — NodeSDK + auto-instrumentations + OTLP proto exporter (preload via `node --require`)
- [x] `nestjs-otel` OpenTelemetryModule + `@Span` demo; trace_id/span_id into pino customProps
- [x] `@willsoto/nestjs-prometheus` — `/metrics` + one custom histogram
- [x] Unit tests: metrics provider wiring → verify: `npm run test`
- [x] code-quality-pipeline → commit
- Deviations (verified during Gate A): custom `MetricsController` is `@Public` + `VERSION_NEUTRAL` + Swagger-excluded (scrapers hit `/metrics`, not `/v1/metrics`); histogram `app_external_api_duration_seconds{operation,outcome}` recorded in `ExternalApiService.fetchTodo` (also the `@Span` demo); `OTEL_ENABLED` schema restricted to literal `true|false` so spellings the preload ignores (`1`, `yes`) fail validation instead of silently disabling tracing; preload smoke-tested against compiled dist in both modes; `/metrics` covered by an integration happy-path (23 int tests total)

### M10 — Docker, compose, CI, docs, integration suite
- [x] Multi-stage `Dockerfile` (node:24 slim builder → distroless nodejs24 nonroot)
- [x] `compose.yaml` — app, postgres:18-alpine+adminer:5, redis:8-alpine+redisinsight, apache/kafka:4.2 (KRaft)+kafbat-ui, localstack (sqs), jaeger v2 — healthchecks + service_healthy deps
- [x] `.env.example` finalized; README (quickstart, env table, architecture, feature map vs Spring template, authz model + revocation-lag note, trust-proxy note)
- [x] GitHub Actions CI: lint + build + unit + integration
- [x] Full integration suite pass → verify: `npm run test:int` (+ `docker compose config` valid)
- [x] code-quality-pipeline (holistic Gate B) → commit
- Deviations (verified during Gate A): distroless base is `nodejs24-debian13:nonroot` (the `-debian12` variant is deprecated/frozen upstream — caught by review); `scripts/localstack-init.sh` tracked as `100755` in git (LocalStack `ready.d` hooks silently skip non-executable scripts; Windows git would otherwise commit `100644`); image build + container boot smoke-tested (fails fast on missing prod `DATABASE_URL` as designed, proving the OTel preload + `require(esm)` inside distroless)

### Close-out (Phase 3)
- [x] Update this plan file: statuses, deviations, verification results
- [x] Update project `CLAUDE.md` (<100 lines, current-state only)
- [x] Run `claude-md-management:claude-md-improver`
- [x] Open PR via `pr-mr-prepare` (single PR for the plan branch)

## Verification results (close-out, 06-07-2026)

- **Unit:** 108 tests / 32 suites green (`npm run test`, ~3.6s)
- **Integration:** 23 tests / 5 suites green against Testcontainers Postgres 18 + Redis 8 (`npm run test:int`, ~26s) — auth flows incl. foreign-issuer rejection, users CRUD + RBAC + 400/409, health liveness/readiness, `/metrics`, 404 envelope
- **Lint/build:** clean (type-checked ESLint; `nest build`); `npm audit` 0 vulnerabilities (multer overridden to ^2.2.0)
- **Docker:** image builds (`node:24-alpine` both stages, nonroot `node` user verified, 536MB); container boots — argon2 musl prebuild loads — and fails fast on missing prod `DATABASE_URL` as designed; `docker compose config` valid
- **Gate A:** ran per milestone (review → simplify → security → final review, parallel subagents; findings fixed each round — see per-milestone deviation notes)
- **Gate B (holistic, 5 lenses + confidence-scored):** 5 confirmed findings, all fixed: pino-convention violations in `AllExceptionsFilter`/`LoggingInterceptor`; non-HTTP context crashes in both filters; same gap in `RolesGuard`/`PermissionsGuard`; stale `debian12` references in the blueprint. Below-threshold extra: `TrimPipe` wired globally (was built but never registered)
