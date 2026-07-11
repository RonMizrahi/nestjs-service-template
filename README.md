# nestjs-service-template

Production-grade **NestJS 11** service template — the Node/TypeScript mirror of
[spring-service-template](https://github.com/RonMizrahi/spring-service-template).
Latest stable stack, zero deprecated APIs, short decorator-heavy code, and every
cross-cutting concern a real service needs, pre-wired and tested.

**Turborepo monorepo (pnpm):** the service lives in `apps/service`; a thin
Vite + React 19 + Tailwind SPA in `apps/web` calls a few endpoints through
`@repo/api-client` (types generated from the service's OpenAPI spec). Shared
tsconfig/eslint live in `packages/*`; Turbo runs lint/typecheck/test/build with caching.

## Workspace

| Package | Path | What it is |
| --- | --- | --- |
| `service` | `apps/service` | NestJS 11 API — all backend code, tests, Dockerfile, migrations |
| `web` | `apps/web` | Vite + React 19 SPA — logs in and calls a few endpoints via the generated client |
| `@repo/api-client` | `packages/api-client` | openapi-fetch client + types **generated** from the service's OpenAPI spec |
| `@repo/eslint-config` | `packages/eslint-config` | shared flat ESLint config (base / node / react variants) |
| `@repo/typescript-config` | `packages/typescript-config` | shared tsconfig bases (base / nest / react) |

## Versions (pinned)

| Layer | Package(s) | Version |
| --- | --- | --- |
| Monorepo | pnpm · Turborepo | 11.11 · 2.x |
| Runtime | Node.js | ≥ 24 LTS |
| Tooling | TypeScript · ESLint · Prettier | 5.9 · 10.6 · 3.9 |
| Backend | NestJS (core + platform-express) | 11.1 |
| Backend | TypeORM · pg · Postgres | 1.0 · 8.22 · 18 |
| Backend | argon2 · zod · cockatiel | 0.44 · 4.4 · 4.0 |
| Backend | @nestjs/swagger · throttler · keyv | 11.4 · 6.5 · 5.6 |
| Backend | kafkajs · @aws-sdk/client-sqs | 2.2 · 3.x |
| Backend | @opentelemetry/sdk-node · nestjs-pino | 0.220 · 4.6 |
| Frontend | React · react-dom | 19.2 |
| Frontend | Vite · @vitejs/plugin-react | 8.1 · 6.0 |
| Frontend | Tailwind CSS · @tailwindcss/vite | 4.3 |
| Frontend | react-router-dom | 7.18 |
| Client | openapi-fetch · openapi-typescript | 0.17 · 7.13 |
| Tests | Jest · Testcontainers · Playwright | 30 · 12 · 1.61 |

## Features

- **HTTP** — Express 5, helmet, CORS, URI versioning (`/v1/...`), global validation
  (`whitelist: true`), consistent error envelope with `correlationId`
- **Auth** — JWT (HS256, issuer-pinned) + argon2id passwords; global secure-by-default
  guard chain: throttle → JWT (`@Public()` opt-out) → roles (`@Roles()`) → permissions
  (`@RequirePermissions()`, claims derived from roles **at token issuance**)
- **Data** — TypeORM 1.0 + Postgres, repository pattern, migrations only
  (`synchronize: false`), worked `users` CRUD example
- **Cache** — Keyv (`@keyv/redis` when `REDIS_URL` is set, in-memory otherwise),
  declarative `CacheInterceptor` + eviction, fail-open main cache with a fail-closed
  health probe store
- **Messaging** — pluggable `MessageBus` port: Kafka / SQS / none via `MESSAGING_DRIVER`;
  producers + consumers for both, `user.created` demo event
- **Resilience** — cockatiel retry → circuit breaker → cooperative timeout around external
  HTTP (`@nestjs/axios`), circuit-open → `503`
- **Observability** — OTel tracing (OTLP → Jaeger v2) via preload, `trace_id` in logs,
  Prometheus `/metrics` + custom histogram, nestjs-pino JSON logs (no PII)
- **Health** — Terminus `/health/liveness` (no dependencies) and `/health/readiness`
  (Postgres ping + real Redis roundtrip)
- **Delivery** — multi-stage Alpine Dockerfile (nonroot user), full `docker compose` dev
  stack with UIs, GitHub Actions CI, Testcontainers integration tests

## Quickstart

```bash
pnpm install
pnpm --filter service start:dev   # service on :3000 (Postgres required — see below)
pnpm --filter web dev             # SPA on :5173 (calls the service)

# or bring up the full backend dev stack (app + postgres/adminer + redis/redisinsight
# + kafka/kafka-ui + localstack + jaeger):
docker compose up --build
```

### Docker Compose stack

`docker compose up --build` starts the service **and** every dependency + dev UI. Services, images, and host ports:

| Service | Image | Host port(s) | Purpose |
| --- | --- | --- | --- |
| `app` | built from `apps/service/Dockerfile` | 3000 | the NestJS service |
| `postgres` | `postgres:18-alpine` | 5432 | primary datastore |
| `adminer` | `adminer:5` | 8081 | Postgres web UI |
| `redis` | `redis:8-alpine` | 6379 | cache + throttler store |
| `redisinsight` | `redis/redisinsight:latest` | 5540 | Redis web UI |
| `kafka` | `apache/kafka:4.2.0` | 29092 (host) | KRaft broker (containers reach it at `kafka:9092`) |
| `kafka-ui` | `ghcr.io/kafbat/kafka-ui:latest` | 8082 | Kafka web UI |
| `localstack` | `localstack/localstack:latest` | 4566 | SQS (for `MESSAGING_DRIVER=sqs`) |
| `jaeger` | `jaegertracing/jaeger:latest` | 16686, 4318 | traces — Jaeger v2, native OTLP ingest |

**Web UIs:** Swagger [`:3000/docs`](http://localhost:3000/docs) · Adminer [`:8081`](http://localhost:8081) ·
RedisInsight [`:5540`](http://localhost:5540) · Kafka UI [`:8082`](http://localhost:8082) ·
Jaeger [`:16686`](http://localhost:16686)

```bash
docker compose up --build      # whole stack (add -d to detach)
docker compose build app       # (re)build just the service image
docker compose down -v         # stop + wipe the postgres volume
```

Try it: `POST /v1/auth/register` → take `accessToken` → `GET /v1/auth/me`.

## Commands

```bash
pnpm turbo run lint typecheck test build   # all packages, cache-aware
pnpm turbo run test:int                    # service integration tests (Testcontainers — Docker)
pnpm turbo run e2e --filter=web            # SPA Playwright e2e (hermetic)
pnpm --filter service start:dev            # service watch mode
pnpm --filter service generate:openapi     # refresh the api-client types (preview mode, no DB)
pnpm --filter web dev                      # SPA dev server (:5173)
pnpm --filter service run migration:generate -- src/migrations/<Name>   # + migration:run / :revert
```

## Environment

Validated by a Zod schema (`src/config/env.schema.ts`) — boot fails fast on invalid
config. Dev defaults exist for everything; **production requires** `DATABASE_URL` and
`JWT_SECRET`.

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | |
| `PORT` | `3000` | |
| `CORS_ORIGINS` | `*` | comma-separated origins |
| `LOG_LEVEL` | `info` | pino level |
| `SWAGGER_ENABLED` | `true` | **disable in production** unless intended |
| `DATABASE_URL` | dev localhost | required in prod |
| `JWT_SECRET` | dev value | required in prod, min 32 chars |
| `JWT_EXPIRES_IN` | `15m` | also the max staleness of role/permission claims |
| `REDIS_URL` | _(unset)_ | unset → in-memory cache |
| `CACHE_TTL_MS` | `30000` | milliseconds |
| `MESSAGING_DRIVER` | `none` | `kafka` \| `sqs` \| `none` |
| `KAFKA_BROKERS` | `localhost:9092` | comma-separated |
| `KAFKA_CLIENT_ID` / `KAFKA_GROUP_ID` | template name | |
| `SQS_QUEUE_URL` | _(unset)_ | **required when driver=sqs** |
| `SQS_REGION` / `SQS_ENDPOINT` | `us-east-1` / _(unset)_ | endpoint only for LocalStack |
| `EXTERNAL_API_URL` | jsonplaceholder | demo dependency |
| `OTEL_ENABLED` | `false` | literal `true`/`false` only |
| `OTEL_SERVICE_NAME` | template name | |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | SDK default `:4318` | |

## Architecture

```
apps/service/src/
  config/        # Zod env schema — the only place process.env is read¹
  common/        # filters, interceptors, guards, decorators, pipes (global via APP_*)
  auth/          # JWT + local strategies, guards, argon2, role→permission policy
  users/         # worked example: entity, repository, service, controller, DTOs
  cache/         # Keyv/Redis cache module + AppCacheService (+ fail-closed probe)
  health/        # Terminus liveness/readiness
  messaging/     # MessageBus port + Kafka/SQS/noop adapters + consumers
  external/      # resilient external API client (cockatiel + axios)
  observability/ # Prometheus /metrics, OTel @Span support
  tracing.ts     # ¹the exception: OTel preload runs BEFORE Nest (node --require)
apps/service/data-source.ts   # standalone DataSource for the TypeORM CLI
```

**Request pipeline:** helmet/CORS → pino (x-request-id) → throttler → JWT guard →
roles guard → permissions guard → ValidationPipe → controller → interceptors
(serializer, logging, optional cache) → exception filters (consistent envelope).

### Authorization model

Endpoints declare **permissions** (`@RequirePermissions(Permission.UsersRead)`);
which roles grant them is auth-side policy (`ROLE_PERMISSIONS`), applied **once at
token issuance** into the signed `permissions` claim. Changing the mapping is an
auth-service change — resource services never redeploy. No external RBAC hop: the
JWT signature (HS256 + issuer pinned) makes claims trustworthy at each service
(zero-trust, zero per-request overhead).

**Tradeoff (accepted):** stateless JWTs mean role/permission changes and bans take
effect on the next token, up to `JWT_EXPIRES_IN` (15m). If you need instant
revocation, add a denylist or a fresh DB check in `JwtStrategy.validate`.

## Deployment notes

- **Behind a proxy/LB:** set Express `trust proxy` (in `main.ts`:
  `app.getHttpAdapter().getInstance().set('trust proxy', 1)`) so the throttler keys
  on the real client IP, not the LB's.
- **`/metrics` and `/health/*` are public by design** (scrapers/probes don't
  authenticate). Restrict them at the ingress if your network isn't trusted.
- **Swagger** is on by default for DX — set `SWAGGER_ENABLED=false` in production.
- The Docker image is Alpine (musl) running as the nonroot `node` user; the OTel preload
  is baked into the image CMD. Both stages are Alpine on purpose — native modules must be
  installed on the libc they run on (argon2 ships musl prebuilds; if you add a native dep
  without them, add `apk add --no-cache python3 make g++` to the build stage).

## Feature map vs spring-service-template

| Concern | Spring | Here |
| --- | --- | --- |
| DI / decorators | Spring annotations | Nest decorators |
| Config validation | `@ConfigurationProperties` | Zod schema, fail-fast |
| Persistence | JPA/Hibernate + Flyway | TypeORM + migrations |
| Auth | Spring Security JWT | Passport JWT + guards + permissions |
| Cache | Spring Cache + Redis | cache-manager + Keyv/Redis |
| Messaging | Spring abstraction (SQS) | MessageBus port (Kafka + SQS) |
| Resilience | Resilience4j | cockatiel |
| Observability | Micrometer + OTel | prom-client + OTel |
| Health | Actuator | Terminus |
| API docs | springdoc | @nestjs/swagger |

## Testing

- **Unit** (`apps/service/**/*.spec.ts`): 108 tests — services, guards, buses, policies.
- **Integration** (`apps/service/test/*.int-spec.ts`): 23 tests against **real Postgres + Redis**
  via Testcontainers — auth flows, users CRUD + RBAC, health, metrics, error envelope.
- **e2e (SPA only)** (`apps/web/e2e/*.spec.ts`): Playwright with the API mocked (hermetic) — login,
  auth-gated routing, health/users panels. The service stays e2e-free (integration covers it).
