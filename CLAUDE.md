# nestjs-service-template

Production-grade NestJS 11 service template — the Node/TypeScript mirror of
[spring-service-template](https://github.com/RonMizrahi/spring-service-template), built to be
latest-stack, deprecation-free, decorator-heavy, and short.

## Stack (pinned by research — see docs/nestjs-service-template-blueprint.md)

- **NestJS 11 / Express 5 / Node 24 LTS / TypeScript / npm**
- **Data:** TypeORM 1.0 + Postgres (`synchronize:false`, migrations via `data-source.ts`)
- **Cache:** @nestjs/cache-manager v3 + Keyv + @keyv/redis (TTL in **ms**, miss returns **undefined**)
- **Auth:** @nestjs/jwt + passport-jwt + argon2id; global JwtAuthGuard + `@Public()`; RBAC via `@Roles()`+RolesGuard
- **Messaging:** pluggable `MESSAGE_BUS` port — Kafka (built-in transport) / SQS (@ssut/nestjs-sqs), switched by `MESSAGING_DRIVER`
- **Resilience:** cockatiel (retry+breaker+timeout, one policy per dependency); HTTP via @nestjs/axios
- **Observability:** OTel (OTLP→Jaeger v2, preloaded `src/tracing.ts`), Prometheus `/metrics`, nestjs-pino JSON logs
- **Health:** Terminus — separate `/health/liveness` and `/health/readiness`
- **Rate limit:** @nestjs/throttler v6 (ttl/limit in **ms**, `seconds()` helper)

## Commands

```bash
npm run start:dev      # watch mode
npm run build          # nest build
npm run test           # unit tests (Jest)
npm run test:int       # integration tests (Testcontainers — Docker required)
npm run lint           # eslint
npm run migration:generate / migration:run / migration:revert
docker compose up      # full dev stack (postgres, redis, kafka, localstack, jaeger + UIs)
```

## Structure

```
src/
  config/        # Zod env schema — the only place process.env is read
  common/        # filters, interceptors, guards, decorators, pipes (global via APP_* tokens)
  auth/          # JWT + local strategies, guards, argon2 password service
  users/         # worked example: entity, repository, service, controller, DTOs
  cache/         # Keyv/Redis cache module + AppCacheService
  health/        # Terminus liveness/readiness + custom Redis indicator
  messaging/     # MessageBus port + Kafka/SQS adapters + consumers
  external/      # resilient external API client (cockatiel + axios)
  observability/ # OTel module, Prometheus metrics
  tracing.ts     # OTel bootstrap — MUST load before Nest (node --require)
data-source.ts   # standalone DataSource for the TypeORM CLI
```

## Conventions (enforced by user skills — load them before editing)

- `nestjs-backend-standards` — repository pattern (services never touch TypeORM), DTO classes only,
  ValidationPipe `whitelist:true, forbidNonWhitelisted:false, transform:true`, no `any`/casting,
  TypeORM current APIs only (`findOneBy`, object relations, callback transactions), JSDoc ≤3 lines +
  full Swagger on every endpoint.
- `testing-standards` — unit tests alongside code; integration via Testcontainers; **no Playwright e2e
  (backend-only)**; every endpoint ≥1 happy-path test; random UUIDs for test data.
- `nestjs-logging` — nestjs-pino (§B): `@InjectPinoLogger(Class.name)`, **metadata-first** args,
  `{ err }` for errors, no PII/secrets in logs.
- Plans, reviews, reports → `docs/<subject>/<name>-<DD>-<MM>-<YYYY>-<type>.md`.

## Key gotchas (verified July 2026)

- Old cache stores (`cache-manager-redis-store`/`-ioredis*`) are deprecated — Keyv only.
- `HttpModule` from `@nestjs/common` is deprecated — import from `@nestjs/axios`.
- Zipkin/Jaeger OTel exporters are deprecated — export OTLP.
- Redis throttler storage = `@nest-lab/throttler-storage-redis` (not `@nestjs/...`).
- SQS is NOT a built-in Nest transport.

## Active plan

`docs/plans/nestjs-service-template-05-07-2026-plan.md` — branch `plan/nestjs-service-template`, one PR at the end.
