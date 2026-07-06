# NestJS Service Template — Build Blueprint (mid‑2026, "latest, no deprecated")

> Research‑backed spec for a production NestJS service template that mirrors and extends
> [`RonMizrahi/spring-service-template`](https://github.com/RonMizrahi/spring-service-template).
> Every library + version below was fetched from npm/official docs and **adversarially fact‑checked**
> (20‑agent deep‑research run, July 2026). Corrections the verifiers made are in
> [§8 Verified gotchas](#8-verified-gotchas--corrections).

**Owner goals:** latest & best‑practice, nothing deprecated · prefer official `@nestjs/*` · big well‑maintained
libs for 3rd‑party · short, decorator‑heavy code · cover everything the Spring template does, and more.

---

## 1. Headline decisions

| Area | Decision |
|---|---|
| Framework | **NestJS 11.1.27** (Express 5 default; Fastify 5 = documented one‑line swap) |
| Runtime / lang | **Node.js 24 LTS**, **TypeScript 6.0.3**, **pnpm 11** |
| Config | `@nestjs/config` v4 + **Zod 4** (fail‑fast, type‑inferred env) |
| ORM | **TypeORM 1.0** (first stable major, actively maintained again) + `pg` + Postgres 18 |
| Cache | `@nestjs/cache-manager` v3 → **cache‑manager v7 / Keyv** (NOT the old redis stores) |
| Auth | `@nestjs/passport` + `passport-jwt` + `@nestjs/jwt`, **argon2** hashing, RBAC via `RolesGuard` |
| Rate limit | `@nestjs/throttler` v6 (+ Redis storage for multi‑pod) |
| Messaging | **Pluggable** `MessageBus` port → **Kafka** (built‑in transport) **+ SQS** (`@ssut/nestjs-sqs`), env‑switched |
| Resilience | **cockatiel** (circuit breaker + retry + timeout + bulkhead in one lib) |
| HTTP client | `@nestjs/axios` (NOT the deprecated `@nestjs/common` HttpModule) |
| Observability | **OpenTelemetry** (OTLP → Jaeger v2) + **Prometheus** metrics + **pino** JSON logs |
| Health | `@nestjs/terminus` — separate liveness/readiness |
| Docker | multi‑stage → **node:24-alpine, nonroot**; compose stack w/ Postgres, Redis, Kafka (KRaft), LocalStack + dev UIs |
| Tests | **Jest 30** (unit/e2e) + **Supertest** + **Testcontainers** |

### Deliberate deltas from the Spring template (all because the Spring choice has no idiomatic Node equivalent or is superseded)

| Spring template used | NestJS template uses | Why |
|---|---|---|
| Zipkin | **OTLP → Jaeger v2** | `@opentelemetry/exporter-zipkin` **deprecated Dec 2025**; Jaeger v2 ingests OTLP natively |
| Micrometer/OTel | **OTel SDK + Prometheus** | Node‑native OTel; `@willsoto/nestjs-prometheus` for pull metrics |
| Resilience4j | **cockatiel** | One TS‑native lib = breaker+retry+timeout+bulkhead+fallback |
| Bucket4j | **`@nestjs/throttler`** | First‑party, decorator‑driven, Redis‑backed for scale |
| Kafka (only) | **Kafka + SQS, pluggable** | Your request; Nest's transport abstraction = Spring's abstract broker layer |
| Redis (Lettuce) | **Keyv + `@keyv/redis`** | cache‑manager v6+ standardized on Keyv |
| JPA/Hibernate | **TypeORM 1.0** | Closest decorator‑for‑decorator match to Spring Data JPA |
| Virtual threads | Node event loop + **Fastify option** | N/A on Node; Fastify swap covers throughput |

---

## 2. Pinned stack (canonical version list)

All versions confirmed on npm registry, July 2026. `^` ranges recommended in `package.json`; exact pins shown for the frozen‑but‑stable libs.

### Core & tooling
```
node            24.x LTS (engines: ">=24")     typescript      6.0.3
pnpm            11.x  (packageManager pnpm@11) @nestjs/cli     11.0.23
@nestjs/core    11.1.27   @nestjs/common 11.1.27
@nestjs/platform-express 11.1.27   (or @nestjs/platform-fastify 11.1.27)
@nestjs/config  4.0.4     zod 4.4.3
```
### API layer
```
class-validator 0.15.1    class-transformer 0.5.1 (frozen 2021, canonical — keep)
@nestjs/swagger 11.4.5     (+ CLI plugin in nest-cli.json)
```
### Auth & security
```
@nestjs/jwt 11.0.2   @nestjs/passport 11.0.5   passport 0.7.0
passport-jwt 4.0.1 (frozen, pin)   passport-local 1.0.0 (frozen, pin)
argon2 0.44.0   helmet 8.2.0
@nestjs/throttler 6.5.0   @nest-lab/throttler-storage-redis 1.2.0   ioredis 5.11.1
```
### Data
```
@nestjs/typeorm 11.0.3   typeorm 1.0.0   pg 8.22.0
```
### Cache & health
```
@nestjs/cache-manager 3.1.3   cache-manager 7.2.9   keyv 5.6.0   @keyv/redis 5.1.6
@nestjs/terminus 11.1.1
```
### Messaging
```
@nestjs/microservices 11.1.27
kafkajs 2.2.4  (built-in transport driver — see gotcha; alt: @confluentinc/kafka-javascript 1.10.0)
@ssut/nestjs-sqs 3.0.1   @aws-sdk/client-sqs 3.1079.0
```
### Resilience & HTTP
```
cockatiel 4.0.0   @nestjs/axios 4.0.1  (axios ~1.18, rxjs ^7)
```
### Observability
```
@opentelemetry/sdk-node 0.220.0   @opentelemetry/auto-instrumentations-node 0.78.0
@opentelemetry/api 1.9.1   @opentelemetry/resources 2.9.0
@opentelemetry/exporter-trace-otlp-proto 0.220.0   @opentelemetry/sdk-metrics 2.9.0
nestjs-otel 8.1.0
@willsoto/nestjs-prometheus 6.1.0   prom-client 15.1.3
nestjs-pino 4.6.1   pino 10.3.1   pino-http 11.0.0   nestjs-cls 6.2.1
```
### Testing
```
jest 30.4.2   ts-jest 29.x   @nestjs/testing 11.1.27   supertest 7.2.2   testcontainers 12.0.4
```
### Docker images
```
node:24-alpine (builder + runtime, nonroot node user)
postgres:18-alpine   adminer:5
redis:8-alpine       redis/redisinsight:latest
apache/kafka:4.2.0 (KRaft, no ZooKeeper)   ghcr.io/kafbat/kafka-ui:latest
localstack/localstack:latest (SQS; needs LOCALSTACK_AUTH_TOKEN on 2026.03+)
jaegertracing/jaeger:2.x (OTLP native)
```

---

## 3. Proposed repo structure

Feature‑module layout (group by domain, thin `common/` for cross‑cutting) — the idiomatic Nest 11 structure, and it mirrors how the Spring template is organized.

```
nestjs-service-template/
├─ src/
│  ├─ main.ts                         # bootstrap: pipes, filters, versioning, swagger, helmet, cors, shutdown hooks
│  ├─ tracing.ts                      # OTel NodeSDK — preloaded via node --require BEFORE main
│  ├─ app.module.ts                   # wires global modules (config, db, cache, throttler, logger, health, messaging)
│  ├─ config/
│  │  ├─ env.schema.ts                # Zod schema + z.infer<Env>
│  │  └─ config.module.ts
│  ├─ common/
│  │  ├─ filters/all-exceptions.filter.ts        # @Catch() catch-all → RFC 9457 envelope
│  │  ├─ filters/http-exception.filter.ts
│  │  ├─ exceptions/app.exception.ts             # AppException + domain subclasses
│  │  ├─ interceptors/logging.interceptor.ts     # per-handler timing
│  │  ├─ interceptors/transform.interceptor.ts   # { data } envelope
│  │  ├─ guards/jwt-auth.guard.ts                # global, @Public() bypass
│  │  ├─ guards/roles.guard.ts                   # RBAC via Reflector
│  │  ├─ decorators/{roles,public,current-user}.decorator.ts
│  │  └─ pipes/trim.pipe.ts
│  ├─ auth/                           # login, JWT issue/verify, passport strategies
│  ├─ users/                          # entity + repository + controller + service (the demo domain)
│  ├─ health/                         # terminus liveness/readiness + custom Redis indicator
│  ├─ cache/                          # CacheModule wiring + AppCacheService (get-or-set)
│  ├─ messaging/                      # MessageBus port + KafkaBus + SqsBus + custom SQS strategy
│  ├─ external/                       # ExternalApiService: @nestjs/axios + cockatiel policy
│  └─ observability/                  # OTel module, Prometheus metrics, pino logger config
├─ test/                             # *.e2e-spec.ts (Supertest) + *.integration-spec.ts (Testcontainers)
├─ data-source.ts                    # standalone TypeORM DataSource for the migrations CLI
├─ Dockerfile                        # multi-stage → alpine nonroot
├─ compose.yaml                      # dev stack (no `version:` key)
├─ nest-cli.json                     # { compilerOptions: { plugins: ["@nestjs/swagger"] } }
├─ .env.example
└─ package.json
```

---

## 4. Bootstrap (`main.ts`) — the one place that wires the globals

```ts
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(Logger));                     // nestjs-pino
app.use(helmet());                                  // before routes
app.enableCors({ origin: cfg.getOrThrow('CORS_ORIGINS').split(','), credentials: true });
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });   // → /v1/...
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
app.enableShutdownHooks();                          // drains DB/Kafka on SIGTERM
SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig),
  { jsonDocumentUrl: 'docs/json' });
await app.listen(cfg.get('PORT', { infer: true }));
```
> Global **filters, guards, interceptors** are registered as `APP_FILTER`/`APP_GUARD`/`APP_INTERCEPTOR`
> providers in `app.module.ts` (not in `main.ts`) so DI works inside them.

---

## 5. Feature blueprints (Spring analog → Nest pattern → what to avoid)

### 5.1 Config — `@nestjs/config` v4 + Zod 4  *(Spring: `application.yaml`)*
Single Zod schema is the source of truth; `z.infer` types `ConfigService<Env, true>`; `validate` fails fast on boot.
**Avoid:** reading `process.env` directly; a Joi schema + hand‑maintained parallel interface (drift).

### 5.2 Controllers + DTO validation + Swagger  *(Spring: `@RestController`, `OpenApiConfig`)*
Thin `@Controller({ path, version })`; DTOs decorated with `class-validator`; global `ValidationPipe`
(`whitelist`+`transform`); `@nestjs/swagger` **CLI plugin** auto‑derives `@ApiProperty` from TS types.
**Avoid:** `@Res()` passthrough (bypasses interceptors/serialization); importing `PartialType`/`OmitType`
from `@nestjs/mapped-types` when using Swagger — import from `@nestjs/swagger` to keep schema metadata.

### 5.3 Exception handling  *(Spring: `GlobalExceptionHandler`, `CustomException`)*
`@Catch(HttpException)` filter normalizes 4xx/5xx into **one RFC 9457** envelope
(`{ statusCode, error, message, path, timestamp, correlationId }`); a second `@Catch()` catch‑all maps
unknowns → 500 (no stack leak). Domain errors extend a typed `AppException extends HttpException`.
**Avoid:** throwing raw `Error`/strings (collapse to generic 500); writing responses off a raw Express `@Res()`
inside the filter — use `HttpAdapterHost` so it stays Express/Fastify‑agnostic.

### 5.4 Interceptors / pipes / guards  *(Spring: interceptors, `WebConfig`)*
`LoggingInterceptor` (rxjs `tap`, per‑handler latency) · `TransformInterceptor` (`{ data }` envelope) ·
`ClassSerializerInterceptor` (`@Exclude()` strips password/token) · custom pipes for param normalization.
**Avoid:** `console.log` (inject `Logger`); hand‑deleting fields (`delete user.password`) — use `@Exclude()`;
returning plain objects (serializer only touches **class instances**).

### 5.5 Auth + RBAC  *(Spring: `SecurityConfig`, `JwtAuthenticationFilter`, `JwtUtil`, roles)*
`@nestjs/jwt` (async‑registered secret) issues/verifies · `passport-jwt` `JwtStrategy` populates `req.user` ·
global `JwtAuthGuard` (`APP_GUARD`) + `@Public()` bypass = **secure by default** · `RolesGuard` + `@Roles()` +
`Reflector.getAllAndOverride` = RBAC · `passport-local` for the login route · **argon2id** hashing.
**Avoid:** `ExtractJwt.fromAuthHeader()` (**removed** → `fromAuthHeaderAsBearerToken()`); `ignoreExpiration: true`;
bcrypt for new code (72‑byte cap); `reflector.get()` (misses class‑level roles).

### 5.6 Persistence — TypeORM 1.0 + Postgres  *(Spring: JPA, `UserRepository`)*
`TypeOrmModule.forRootAsync` + `autoLoadEntities`, `synchronize:false`; `@Entity`/`@Column`/
`@PrimaryGeneratedColumn('uuid')`; `@InjectRepository(User)`; migrations via a standalone `data-source.ts` +
`typeorm` CLI; `dataSource.transaction(...)` callback form.
**Avoid (all removed in 1.0):** `findOneById`/`findByIds` → `findOneBy({id})`/`findBy({id: In([])})` ·
`@EntityRepository` → `Repository.extend()` · `Connection`/`createConnection` → `DataSource` ·
`ormconfig`/`TYPEORM_*` env → exported `DataSource` · `synchronize:true` in prod · `@Transaction*` decorators.

### 5.7 Caching (Redis) + health  *(Spring: `RedisCacheService`, `DatabaseHealthIndicator`)*
`CacheModule.registerAsync({ stores: [ new Keyv({ store: new KeyvRedis(url) }) ] })` · global `CacheInterceptor`
(GET auto‑cache) + `@CacheKey`/`@CacheTTL` · imperative `AppCacheService` via `CACHE_MANAGER` token ·
Terminus **separate** `/health/liveness` (no deps) and `/health/readiness` (DB + custom Redis indicator).
**Avoid:** pre‑v6 `CacheModule.register({ store: redisStore, host, port })` and the **deprecated stores**
(`cache-manager-redis-store`, `cache-manager-ioredis`, `cache-manager-ioredis-yet`); TTL is now **milliseconds**;
cache miss returns **`undefined`** (not `null`); one combined `/health` endpoint (blips restart the pod);
legacy `extends HealthIndicator` + `getStatus()` → inject `HealthIndicatorService` and `.up()/.down()`.

### 5.8 Messaging — pluggable Kafka + SQS  *(Spring: `KafkaEventPublisher`/`Listener`, abstract broker)*
One `MessageBus` port (`publish`/`ask`) + a decorator‑driven consumer, transport chosen by `MESSAGING_DRIVER`
env. **Kafka** via built‑in `Transport.KAFKA` (`@EventPattern` for events, `@MessagePattern` for request‑reply,
`ClientKafka.emit/send`, `subscribeToResponseOf` in `onModuleInit`). **SQS** via `@ssut/nestjs-sqs`
(`@SqsMessageHandler` consumer, `SqsService` producer) — or a `CustomTransportStrategy extends Server` for full
`@MessagePattern` parity. `KafkaBus`/`SqsBus` both implement the port; a `useFactory` picks one.
**Avoid:** assuming a `Transport.SQS` exists (**it doesn't** — SQS is not a built‑in transport);
leaking `KafkaContext`/SQS `Message` into domain services; `@MessagePattern` for pure fire‑and‑forget events;
`aws-sdk` v2 (EOL) → `@aws-sdk/client-sqs` v3. *(kafkajs is unmaintained — see gotcha 8.3.)*

### 5.9 Resilience + external calls  *(Spring: Resilience4j, `ExternalApiService`)*
`@nestjs/axios` `HttpService` wrapped by **one cockatiel policy built once per dependency**:
`wrap(retry(expBackoff), circuitBreaker(ConsecutiveBreaker(5)), timeout(Aggressive))`; map `BrokenCircuitError`
→ `ServiceUnavailableException` (503) in a filter.
**Avoid:** `HttpModule`/`HttpService` from `@nestjs/common` (**deprecated** → `@nestjs/axios`); a new breaker per
request (state must be shared); blindly retrying non‑idempotent POSTs / 4xx; hand‑rolled `setTimeout` retry loops.

### 5.10 Observability  *(Spring: `PerformanceMonitoringAspect`, Zipkin, Micrometer)*
`tracing.ts` = `NodeSDK` + `auto-instrumentations-node`, **preloaded via `node --require` before Nest loads**,
exporting **OTLP** to Jaeger v2; `nestjs-otel` `@Span()` for custom spans; `@willsoto/nestjs-prometheus` `/metrics`;
`nestjs-pino` JSON logs with `redact` (auth/cookie/PII) + `trace_id`/`span_id`/`correlationId` on every line.
**Avoid:** `@opentelemetry/exporter-zipkin` and `@opentelemetry/exporter-jaeger` (**both deprecated** → OTLP);
`SimpleSpanProcessor` in prod (use batch); `pino-pretty` transport in prod; starting the SDK after `@nestjs/core` loads.

### 5.11 Ops — Docker + compose + tests  *(Spring: Dockerfile, compose, test suite)*
Multi‑stage Dockerfile (`node:24-alpine` builder → `node:24-alpine` nonroot runtime,
`npm ci`/`pnpm`, `--omit=dev`, `USER nonroot`, ~120–180 MB). `compose.yaml` (no `version:` key) boots
Postgres+Adminer, Redis+RedisInsight, Kafka(KRaft)+kafbat‑UI, LocalStack(SQS), Jaeger — all with healthchecks +
`depends_on: condition: service_healthy`. Tests: Jest unit (`Test.createTestingModule` + `overrideProvider`),
Supertest e2e (`app.getHttpServer()`), Testcontainers integration (real PG/Redis/Kafka).
**Avoid:** single‑stage builds / `npm install` / `node:latest` / running as root; standalone `docker-compose` v1 +
top‑level `version:` key; **`provectuslabs/kafka-ui`** (abandoned, RCE CVE‑2023‑52251) → `kafbat/kafka-ui`;
**`rediscommander/redis-commander`** (unmaintained) → `redis/redisinsight`; ZooKeeper (removed in Kafka 4.x).

---

## 6. Build sequence (proposed)

1. **Scaffold** — `nest new` (pnpm), tsconfig (Node 24/ES2023), `nest-cli.json` swagger plugin, `package.json` engines + `packageManager`.
2. **Config + bootstrap** — Zod env schema, `main.ts` (pipes/versioning/helmet/cors/swagger/shutdown), `tracing.ts`.
3. **Common** — exception filters, interceptors, guards, pipes, decorators.
4. **Data** — TypeORM module, `User` entity/repo, `data-source.ts` + first migration, Postgres wiring.
5. **Auth** — JWT + passport strategies, `JwtAuthGuard`/`RolesGuard`, argon2, login/refresh.
6. **Users domain** — controller/service/DTOs (the worked example exercising the whole chain).
7. **Cache + health** — Keyv/Redis cache, `AppCacheService`, Terminus liveness/readiness.
8. **Messaging** — `MessageBus` port + Kafka + SQS adapters + custom SQS strategy, env switch.
9. **Resilience + external** — `@nestjs/axios` + cockatiel `ExternalApiService`.
10. **Observability** — OTel, Prometheus, pino, throttler.
11. **Docker + compose** — multi‑stage image, full dev stack.
12. **Tests** — unit + e2e + Testcontainers; CI workflow.
13. **README** — quickstart, env table, architecture, per‑feature notes.

---

## 7. Open choices (sensible defaults picked; flag if you disagree)

- **HTTP adapter:** default **Express 5** (Nest's own default, maximum middleware/ecosystem compatibility, `helmet` works directly). Fastify 5 is a documented one‑file swap for ~2× throughput (needs `@fastify/helmet`). *Recommend keeping Express default for a template.*
- **Metrics:** default **`@willsoto/nestjs-prometheus`** (pull `/metrics`) since it's the simplest, most standard path; OTel metrics is documented as the alternative if you want one unified traces+metrics pipeline.
- **Kafka driver:** ship the built‑in `Transport.KAFKA` (needs `kafkajs`) as default; document `@confluentinc/kafka-javascript` via a custom strategy as the maintained‑driver upgrade.

---

## 8. Verified gotchas & corrections

These are the highest‑value findings — where "latest, no deprecated" actually bites, including corrections the fact‑checkers made to the initial research.

1. **pnpm 11, not 10** — verifier **REFUTED** the pnpm‑10 recommendation: pnpm 11 is current (`latest` = 11.10.0). Requires Node 22+ (fine on Node 24). → pin `pnpm@11.x`.
2. **Node 24, not 22** — Node 24 is the current **Active LTS**; Node 22 is already Maintenance LTS ("don't pin for new work"). The Docker base is **`node:24-alpine`** (user decision 06-07-2026; distroless was the researched default) (the ops researcher's conservative `node:22` was overridden to stay consistent).
3. **kafkajs is effectively unmaintained** — `2.2.4`, last published **2023‑02‑27** (>3 yrs). It still works and is what the built‑in transport requires, but for greenfield/perf‑critical use, `@confluentinc/kafka-javascript` (librdkafka, KafkaJS‑compatible API, official Confluent support) via a `CustomTransportStrategy` is the maintained path.
4. **SQS is NOT a built‑in Nest transport** — confirmed. Built‑in transporters: TCP, Redis, RabbitMQ, NATS, MQTT, Kafka, gRPC. SQS needs `@ssut/nestjs-sqs` (last publish 2025‑02, stable/slow) or a custom strategy.
5. **cache‑manager v6+ = Keyv** — the biggest migration hazard. Every old `store:` package is deprecated (`cache-manager-ioredis-yet` is npm‑deprecated with "we now are using Keyv"). TTL is **milliseconds**; cache miss returns **`undefined`**. (Minor verifier nit: TTL became ms in v5, not v4/v5 — irrelevant to the v6/v7 code.)
6. **`@nestjs/throttler` v6** — `ttl`/`limit` are **milliseconds** (use the `seconds()` helper); config is a `throttlers: []` array; Redis storage package is **`@nest-lab/throttler-storage-redis`** (the `@nestjs/throttler-storage-redis` name is NOT current).
7. **`HttpModule` moved** — importing `HttpModule`/`HttpService` from `@nestjs/common` is **deprecated** → import from **`@nestjs/axios`**.
8. **Zipkin & Jaeger exporters deprecated** — `@opentelemetry/exporter-zipkin` was formally deprecated **Dec 2025** (removal ~Dec 2026); `@opentelemetry/exporter-jaeger` also deprecated. Export **OTLP**; Jaeger v2 ingests it natively on 4317/4318. *(This is the one place the Nest template intentionally diverges from your Spring template's Zipkin.)*
9. **TypeORM 1.0 is real and maintained** — first stable major (2026‑05‑19); new maintainers since late 2024, 575 PRs merged in 2025, ~2M weekly downloads. The "TypeORM is abandoned" meme is **outdated**. Removed APIs listed in §5.6.
10. **passport‑jwt / passport‑local are frozen but not abandoned** — `4.0.1` (2022) / `1.0.0` (2014); pin them. `ExtractJwt.fromAuthHeader()` was **removed**.
11. **argon2 over bcrypt** — Argon2id is the OWASP/NIST 2026 recommendation (memory‑hard, no 72‑byte cap); bcrypt 6 is "safe" but not state‑of‑the‑art.
12. **class‑transformer 0.5.1 is stale (2021) but canonical** — it's the exact version NestJS ships with; keep it, don't "upgrade" to a fork.
13. **Docker/compose modernization** — no top‑level `version:` key; `docker compose` v2; `apache/kafka` KRaft (no ZooKeeper); `kafbat/kafka-ui` (not abandoned provectus); `redis/redisinsight` (not redis‑commander); LocalStack **now needs `LOCALSTACK_AUTH_TOKEN`** on 2026.03+.

---

## 9. Key sources (authoritative, per area)

- **NestJS 11:** trilon.io/blog/announcing-nestjs-11-whats-new · docs.nestjs.com
- **Config/Zod:** docs.nestjs.com/techniques/configuration · registry.npmjs.org/@nestjs/config
- **TypeORM 1.0:** typeorm.io/blog/typeorm-1-0 · infoq.com/news/2026/06/typeorm-1-released · docs.nestjs.com/techniques/sql
- **Cache/Keyv:** docs.nestjs.com/techniques/caching · keyv.org/docs/caching/caching-nestjs · registry.npmjs.org/cache-manager-ioredis-yet (deprecation)
- **Terminus:** docs.nestjs.com/recipes/terminus
- **Microservices/Kafka/SQS:** docs.nestjs.com/microservices/{basics,kafka,custom-transport} · github.com/ssut/nestjs-sqs · confluent.io/blog/introducing-confluent-kafka-javascript
- **Resilience:** github.com/connor4312/cockatiel · docs.nestjs.com/techniques/http-module
- **OTel:** opentelemetry.io/blog/2025/deprecating-zipkin-exporters · opentelemetry.io/docs/languages/js · github.com/pragmaticivan/nestjs-otel
- **Logging:** github.com/iamolegga/nestjs-pino
- **Security:** docs.nestjs.com/security/{authentication,authorization,rate-limiting,helmet} · docs.nestjs.com/security/encryption-and-hashing
- **Docker/testing:** docs.docker.com/compose/compose-file · github.com/kafbat/kafka-ui · node.testcontainers.org · docs.nestjs.com/fundamentals/testing

---

*Generated from a 20‑agent deep‑research run (10 researchers + 10 adversarial verifiers), 256 web lookups, July 2026. Version numbers were confirmed against the npm registry; deprecation/official‑vs‑3rd‑party claims were independently fact‑checked.*
