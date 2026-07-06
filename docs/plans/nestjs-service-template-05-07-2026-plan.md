# NestJS Service Template — Implementation Plan (05-07-2026)

> Executes [`docs/nestjs-service-template-blueprint.md`](../nestjs-service-template-blueprint.md) (research-verified stack, July 2026).
> Standards in force: `nestjs-backend-standards` (TypeORM section), `testing-standards`, `nestjs-logging` (§B nestjs-pino), `code-quality-pipeline`, `pr-mr-prepare`.

## Status: IN PROGRESS

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

## Milestones

Every milestone ends with: **unit tests green → integration tests green (where applicable) → `code-quality-pipeline` → commit(s) on the plan branch.**

### M1 — Foundation & bootstrap
- [ ] Scaffold project: `package.json` (Nest 11 deps), `tsconfig`, `nest-cli.json` (+ swagger CLI plugin), eslint/prettier, `.gitignore`, `.env.example`
- [ ] `src/config/env.schema.ts` — Zod schema + `Env` type; `ConfigModule.forRoot({ validate })`
- [ ] `src/main.ts` — bufferLogs, pino logger, helmet, CORS (env-driven), URI versioning (`/v1`), global ValidationPipe (per standards), Swagger at `/docs` (+ bearer auth), `enableShutdownHooks`
- [ ] `nestjs-pino` LoggerModule (genReqId/correlation-id, redact, pretty in dev only)
- [ ] Unit tests: env schema (valid/invalid/defaults) → verify: `npm run test`
- [ ] Smoke integration test: app boots, `GET /docs-json` 200 → verify: `npm run test:e2e`
- [ ] code-quality-pipeline → commit

### M2 — Common cross-cutting layer
- [ ] `common/exceptions/app.exception.ts` — `AppException extends HttpException` + `ResourceNotFoundException`
- [ ] `common/filters/` — `HttpExceptionFilter` (@Catch(HttpException), RFC 9457-style envelope + correlationId) and `AllExceptionsFilter` (@Catch(), HttpAdapterHost, 500 without leak); registered via `APP_FILTER`
- [ ] `common/interceptors/` — `LoggingInterceptor` (handler timing), `TransformInterceptor` (`{ data }`), global `ClassSerializerInterceptor`
- [ ] `common/decorators/` — `@Public()`, `@Roles()`, `@CurrentUser()`
- [ ] `common/pipes/trim.pipe.ts`
- [ ] Unit tests per filter/interceptor/pipe (happy path + error shape) → verify: `npm run test`
- [ ] code-quality-pipeline → commit

### M3 — Persistence (TypeORM + Postgres)
- [ ] `TypeOrmModule.forRootAsync` (ConfigService, `autoLoadEntities`, `synchronize:false`)
- [ ] `users/entities/user.entity.ts` — uuid PK, unique email, roles enum array, timestamptz audit columns, `@Exclude()` passwordHash
- [ ] `users/users.repository.ts` — repository pattern over `@InjectRepository(User)` (`findOneBy`, current APIs only)
- [ ] `data-source.ts` + initial migration + npm scripts (`migration:generate/run/revert`)
- [ ] Unit tests: repository with mocked TypeORM repo → verify: `npm run test`
- [ ] Integration test: repository CRUD against Testcontainers Postgres (random UUID emails) → verify: `npm run test:int`
- [ ] code-quality-pipeline → commit

### M4 — Auth & security (JWT, RBAC, argon2, throttler)
- [ ] `auth/password.service.ts` — argon2id (OWASP params)
- [ ] `auth/auth.service.ts` — register/validateCredentials/issue tokens (`@nestjs/jwt` registerAsync)
- [ ] Strategies: `jwt.strategy.ts` (Bearer, no ignoreExpiration), `local.strategy.ts`
- [ ] Guards: global `JwtAuthGuard` (APP_GUARD + `@Public()` bypass), `RolesGuard` (getAllAndOverride)
- [ ] `auth/auth.controller.ts` — POST /auth/register (Public), POST /auth/login (Public + LocalAuthGuard), GET /auth/me
- [ ] `ThrottlerModule` (named tiers, ms via `seconds()`), strict `@Throttle` on login
- [ ] Unit tests: password service, auth service, both guards → verify: `npm run test`
- [ ] Integration test: register→login→me happy path + 401/403 paths (Testcontainers PG) → verify: `npm run test:int`
- [ ] code-quality-pipeline → commit

### M5 — Users domain (worked example)
- [ ] DTOs: `create-user.dto.ts`, `update-user.dto.ts` (PartialType from @nestjs/swagger), `user-response.dto.ts`
- [ ] `users.service.ts` (business logic over repository) + `users.controller.ts` (v1, full Swagger, @Roles(admin) on destructive routes)
- [ ] Unit tests: service (mocked repository), controller (mocked service) → verify: `npm run test`
- [ ] Integration test: CRUD happy path + validation 400 + RBAC 403 → verify: `npm run test:int`
- [ ] code-quality-pipeline → commit

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
- [ ] `external/resilience.ts` — cockatiel wrap(retry+breaker+timeout) built once per dependency
- [ ] `external/external-api.service.ts` — @nestjs/axios through the policy, BrokenCircuitError→503
- [ ] Demo controller route exposing the external call
- [ ] Unit tests: retry/breaker behavior (fake failing fn), 503 mapping → verify: `npm run test`
- [ ] code-quality-pipeline → commit

### M9 — Observability (OTel + Prometheus)
- [ ] `src/tracing.ts` — NodeSDK + auto-instrumentations + OTLP proto exporter (preload via `node --require`)
- [ ] `nestjs-otel` OpenTelemetryModule + `@Span` demo; trace_id/span_id into pino customProps
- [ ] `@willsoto/nestjs-prometheus` — `/metrics` + one custom histogram
- [ ] Unit tests: metrics provider wiring → verify: `npm run test`
- [ ] code-quality-pipeline → commit

### M10 — Docker, compose, CI, docs, integration suite
- [ ] Multi-stage `Dockerfile` (node:24 slim builder → distroless nodejs24 nonroot)
- [ ] `compose.yaml` — app, postgres:18-alpine+adminer:5, redis:8-alpine+redisinsight, apache/kafka:4.2 (KRaft)+kafbat-ui, localstack (sqs), jaeger v2 — healthchecks + service_healthy deps
- [ ] `.env.example` finalized; README (quickstart, env table, architecture, feature map vs Spring template)
- [ ] GitHub Actions CI: lint + build + unit + integration
- [ ] Full integration suite pass → verify: `npm run test:int` (+ `docker compose config` valid)
- [ ] code-quality-pipeline (holistic Gate B) → commit

### Close-out (Phase 3)
- [ ] Update this plan file: statuses, deviations, verification results
- [ ] Update project `CLAUDE.md` (<100 lines, current-state only)
- [ ] Run `claude-md-management:claude-md-improver`
- [ ] Open PR via `pr-mr-prepare` (single PR for the plan branch)

## Verification results
*(filled at close-out)*
