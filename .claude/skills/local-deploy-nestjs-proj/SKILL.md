---
name: local-deploy-nestjs-proj
version: 1.0.0
description: >
  Sets up and runs the nestjs-service-template locally — validates tools, installs the pnpm workspace,
  brings up the Docker Compose dev stack (NestJS service + Postgres/Adminer + Redis/RedisInsight +
  Kafka/Kafka-UI + LocalStack + Jaeger), and optionally starts the apps/web SPA. Invoke this skill
  whenever the user mentions running, starting, deploying, or setting up this service locally — including
  "get the service running", "start the local stack", "docker compose up", "spin up the dev stack",
  "run the app locally", "start the SPA", or any question about service ports, web UIs, hot reload,
  rebuilds, migrations, or why the compose stack won't come up. When in doubt, use this skill.
author: Ron Mizrahi
category: devops
tags: [docker-compose, local-dev, nestjs, monorepo, pnpm, postgres, kafka, debug, deploy]
tools: [Bash, Read]
prerequisites: []
---

# nestjs-service-template — Local Deploy & Debug

## Architecture

Unlike a multi-repo setup, **everything lives in one repo** — a pnpm + Turborepo monorepo. There is
nothing to clone from elsewhere; you are already in the workspace.

| Piece | Path | How to run |
|---|---|---|
| **Backend service + all deps** | repo root `compose.yaml` | Docker Compose — `docker compose up` from the repo root |
| **SPA (`apps/web`)** | `apps/web` | Vite dev server on the host (`:5173`) — **not** in Docker; calls the containerized service at `:3000` |

```
apps/service/   # NestJS 11 API — Dockerfile, migrations, data-source.ts
apps/web/       # Vite + React 19 SPA — @repo/api-client
packages/*      # shared eslint / tsconfig / generated api-client
compose.yaml    # the full dev stack (repo ROOT — also the Docker build context)
```

The compose `app` service is built from `apps/service/Dockerfile` with **build context = the repo root**
(so the whole workspace is available to `pnpm --filter service deploy`). The effective `.dockerignore`
is the one at the repo root.

The service auto-runs TypeORM migrations on boot (`migrationsRun: true`), so a fresh stack comes up with
the schema already created — **no seed/restore step needed**.

---

## Prerequisites

| Tool | Minimum version | Install |
|---|---|---|
| git | ≥ 2.x | pre-installed on macOS |
| Node.js | ≥ 24 LTS | nvm or https://nodejs.org |
| pnpm | 11.x | `corepack enable` (pinned via `packageManager`) |
| Docker | running, Compose v2 | Docker Desktop / Rancher Desktop |

No GitLab, no AWS account, and **no AWS SSO** are required — the optional SQS path runs fully locally
against LocalStack. Only the `sqs` messaging driver touches AWS APIs, and even then it points at
LocalStack, not real AWS.

---

## Execution Steps

### Step 1 — Validate Required Tools

```bash
git --version        # ≥ 2.x
node --version       # ≥ 24
pnpm --version       # 11.x  (run `corepack enable` if missing)
docker info          # Docker must be running
docker compose version  # Compose v2
```

If **anything is missing**, tell the user exactly which tool, then offer to install it
(`corepack enable` for pnpm; point them at Docker Desktop / Rancher Desktop if the daemon isn't running).
The global `onboarding` skill can set up a fresh macOS machine if they want the full stack.

### Step 2 — Confirm the Workspace

You should already be inside the repo. Confirm by checking for `compose.yaml` **at the repo root** and the
`apps/service` / `apps/web` layout:

```bash
ls compose.yaml apps/service/Dockerfile apps/web/package.json
```

If you're not in the repo, ask the user for the path — **never scan their filesystem** looking for it.

### Step 3 — Install the Workspace (first run / after dependency changes)

Needed for running the SPA on the host and for any `pnpm --filter ...` command. The Docker image installs
its own dependencies during the build, so this is **not** required just to `docker compose up`.

```bash
pnpm install
```

`pnpm 11` gates native/postinstall builds (argon2, ssh2, cpu-features, unrs-resolver, protobufjs) behind the
`allowBuilds:` map in `pnpm-workspace.yaml` — if a native dep silently didn't build, that map is where it's
approved.

### Step 4 — Start the Stack

All `docker compose` commands run from the **repo root** (where `compose.yaml` lives). The stack needs no
`.env` — every variable is set inline in `compose.yaml` (the `app` runs with `NODE_ENV=development` on
purpose, to keep Swagger and pretty logs).

Before starting, check the key host ports are free — at minimum `3000` (app) and `5432` (postgres):

```bash
lsof -nP -iTCP:3000 -iTCP:5432 -sTCP:LISTEN
```

If a port is taken, **ask the user before killing anything.**

Ask the user how to start:

> "How would you like to start the stack?
> 1. **Start** — bring containers up as-is (fastest)
> 2. **Rebuild** — rebuild the `app` image to pick up service code changes
> 3. **Clean start** — wipe the Postgres volume and rebuilt images, start from scratch"

**Option 1 — Start:**
```bash
docker compose up -d
```
**Option 2 — Rebuild:**
```bash
docker compose up -d --build
```
**Option 3 — Clean start** (also wipes DB data — the schema is recreated on boot by migrations):
```bash
docker compose down -v --rmi local && docker compose up -d --build
```

Run detached (`-d`) and then **actively monitor** (see Monitoring Rules). Startup order is enforced by
`depends_on` health gates: postgres/redis/kafka become healthy, the `kafka-init` one-shot pre-creates the
`user.created` topic and **exits 0** (this is expected — not a failure), then `app` starts.

Verify:
```bash
docker compose ps -a
curl -sf http://localhost:3000/health/readiness   # expect {"status":"ok", database:up, cache:up}
```
`kafka-init` showing `Exited (0)` is correct. Every other service should be `Up` / `healthy`.
Tell the user: **"All services are up and running ✓"** and share the Web UIs (see Reference).

### Step 5 — Start the SPA (optional)

The `apps/web` SPA is **not** in the compose stack — it runs on the host and calls the containerized
service at `:3000`:

```bash
pnpm --filter web dev     # http://localhost:5173
```

If `:5173` is busy, Vite silently drifts to another port — free it first (`lsof -ti:5173 | xargs kill -9`)
if you need the canonical URL.

### Step 6 — Final Summary (mandatory)

End every deploy with a summary so the user can operate the stack without an agent next time:

```markdown
## Deploy summary

**What was done:** <repos/install, stack start mode, any issues hit and how fixed>

**Currently running (background tasks of this session):**
- `docker compose up -d` — the stack (logs: `docker compose logs -f app`)
- `pnpm --filter web dev` — SPA at http://localhost:5173  (if started)

**Web UIs:** Swagger :3000/docs · Adminer :8081 · RedisInsight :5540 · Kafka UI :8082 · Jaeger :16686

**Run it yourself (outside Claude), from the repo root:**
​```bash
docker compose up -d --build      # the stack
pnpm --filter web dev             # the SPA (http://localhost:5173)
​```
Stop: `docker compose down` (add `-v` to also wipe the Postgres volume).
```

---

## Monitoring Rules

Failures in this stack are loud in the logs but easy to miss in `docker compose ps` — a crash-looping or
dependency-failed container can still print reassuring lines.

- **Show progress.** While `up`/`build` runs, report phase transitions ("images building", "postgres
  healthy", "kafka-init done", "app started") rather than going silent.
- **Never wait without a deadline.** Give every wait loop a timeout and a stall check — if `docker compose ps`
  shows the same non-converged state for ~60s, stop and read the logs; a stack that isn't converging is
  failing, not "still starting".
- **Scan logs proactively.** After `up`, grep the app logs before declaring success:
  ```bash
  docker compose logs app | grep -Ei "error|crash|unable to determine transport|KafkaJSProtocolError|ECONNREFUSED|exited"
  ```
  Match anything against the **Common Failures** table and apply the documented fix.
- **`dependency failed to start`** during `up` means a health-gated dependency (usually **postgres**)
  exited — check that service's logs first, not the app's.
- **Verify success positively.** Confirm `Nest application successfully started` in the app logs **and**
  a `200` from `/health/readiness` — "no errors scrolled by" is not verification.

---

## Important Rules

- **Explain before you ask.** Whenever a step needs the user to act (free a port, choose a start mode,
  wipe the volume), give the one-sentence reason first.
- **Run compose from the repo root.** `compose.yaml` and the Docker build context both live there. Never
  use `docker compose -f <path>` from elsewhere.
- **Stay inside the workspace.** Never scan the filesystem beyond the current repo.
- **`kafka-init Exited (0)` is success, not failure** — it's a one-shot topic creator.
- **Ask before destructive actions** — killing a port holder, `down -v`, or `--rmi local` all lose state;
  confirm with the user first.

---

## Reference

### Service & Port Map

Read ports from `compose.yaml` (`ports:` under each service, `host:container`). Current map:

| Service | Image | Host port(s) | Purpose |
|---|---|---|---|
| `app` | built from `apps/service/Dockerfile` | 3000 | the NestJS service (Swagger at `/docs`) |
| `postgres` | `postgres:18-alpine` | 5432 | primary datastore |
| `adminer` | `adminer:5` | 8081 | Postgres web UI |
| `redis` | `redis:8-alpine` | 6379 | cache + throttler store |
| `redisinsight` | `redis/redisinsight:latest` | 5540 | Redis web UI |
| `kafka` | `apache/kafka:4.2.0` | 29092 (host) | KRaft broker — containers reach it at `kafka:9092` |
| `kafka-init` | `apache/kafka:4.2.0` | — | one-shot: pre-creates the `user.created` topic, exits 0 |
| `kafka-ui` | `ghcr.io/kafbat/kafka-ui:latest` | 8082 | Kafka web UI |
| `localstack` | `localstack/localstack:4.4.0` | 4566 | SQS (only for `MESSAGING_DRIVER=sqs`) |
| `jaeger` | `jaegertracing/jaeger:latest` | 16686, 4318 | traces — Jaeger v2, native OTLP |
| **`web` (SPA)** | — (host, not Docker) | 5173 | `pnpm --filter web dev` |

**Web UIs:** Swagger [`:3000/docs`](http://localhost:3000/docs) · Adminer [`:8081`](http://localhost:8081) ·
RedisInsight [`:5540`](http://localhost:5540) · Kafka UI [`:8082`](http://localhost:8082) ·
Jaeger [`:16686`](http://localhost:16686)

### Messaging drivers

The compose `app` defaults to `MESSAGING_DRIVER=kafka`. To exercise the **SQS** path instead, set
`MESSAGING_DRIVER=sqs` plus `SQS_QUEUE_URL` / `SQS_ENDPOINT` / `SQS_REGION` on the `app` service (the
commented block in `compose.yaml`) — it targets LocalStack, so no AWS credentials are needed. The
LocalStack init script (`apps/service/scripts/localstack-init.sh`) creates the `user-events` queue on boot.

### Hot reload / Rebuild rules

The compose `app` runs the **production image** (`node --require ./dist/tracing dist/main`) — it does **not**
hot-reload. For a fast edit loop on the backend, run the service outside Docker instead:

```bash
pnpm --filter service start:dev     # watch mode on :3000 (needs Postgres — use the compose one)
```

| What changed | Action |
|---|---|
| Service source (`apps/service/src`) and you're on the compose image | `docker compose up -d --build app` |
| Service source, fast loop wanted | `pnpm --filter service start:dev` (host) against compose Postgres/Redis |
| `apps/service/package.json` / lockfile | `docker compose build --no-cache app` then `up -d` |
| SPA source (`apps/web`) | `pnpm --filter web dev` hot-reloads automatically |

### Migrations

Schema is created automatically on app boot (`migrationsRun: true`). Manual CLI (from `apps/service`, uses
`data-source.ts`):

```bash
pnpm --filter service run migration:run
pnpm --filter service run migration:generate -- src/migrations/<Name>
pnpm --filter service run migration:revert
```

### OpenAPI client

`packages/api-client` types are generated from the service OpenAPI spec and **committed**. Regenerate after
changing endpoints/DTOs:

```bash
pnpm --filter service generate:openapi     # preview mode — no DB/Redis/Kafka needed
```

### Teardown

```bash
docker compose down              # stop + remove containers (Postgres volume kept)
docker compose down -v           # also wipe the Postgres volume
docker compose down -v --rmi local   # also remove locally built images
```

### Key files

| File | Purpose |
|---|---|
| `compose.yaml` (repo root) | Stack definition — services, ports, env, build context |
| `apps/service/Dockerfile` | Multi-stage Alpine image — build context is the repo root |
| `.dockerignore` (repo root) | The effective ignore file (context = root) |
| `apps/service/data-source.ts` | Standalone DataSource for the TypeORM CLI |
| `apps/service/src/config/env.schema.ts` | Zod env schema — boot fails fast on invalid config |
| `apps/service/scripts/localstack-init.sh` | Creates the `user-events` SQS queue in LocalStack |

### Common Failures

These are the real gotchas of this stack (several were live bugs that are now fixed in `compose.yaml` /
`package.json` — listed so a regression is instantly recognizable).

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot connect to the Docker daemon` | Docker not running | Start Docker Desktop / Rancher Desktop, wait for "running" |
| `docker compose ps` shows **postgres Exited (1)** and `dependency failed to start`; logs mention *"data in /var/lib/postgresql/data (unused mount/volume)"* | Postgres 18 moved `PGDATA` to a version subdir (`/var/lib/postgresql/18/docker`); volume was mounted at the old `/var/lib/postgresql/data` | Mount the volume at the **parent** `/var/lib/postgresql` (already fixed in `compose.yaml`). If it recurs on an old volume: `docker compose down -v` then `up` |
| **app** crash-loops with `unable to determine transport target for "pino-pretty"` | Compose runs `NODE_ENV=development` (for Swagger + pretty logs) but the prod image excludes devDependencies — `pino-pretty` must be a **runtime** dep | Keep `pino-pretty` in `apps/service` `dependencies` (already fixed). If reverted: move it back and rebuild the image |
| **app** exits with `KafkaJSProtocolError: ... UNKNOWN_TOPIC_OR_PARTITION` on first boot | Consumer subscribed to `user.created` before the topic existed; KafkaJS throws fatally and the app has no `restart` policy | The `kafka-init` one-shot pre-creates the topic and `app` waits on `service_completed_successfully` (already fixed). Confirm `kafka-init` exists and ran |
| **localstack** exits **55: "License activation failed"** | `localstack/localstack:latest` now (v2026.3.0+) requires a `LOCALSTACK_AUTH_TOKEN` even for community SQS | Pinned to `localstack/localstack:4.4.0`, the last token-free release (already fixed). Only matters for the `sqs` driver |
| `EADDRINUSE` / `port is already allocated` | Host port (3000/5432/…) already in use | `lsof -nP -iTCP:<port> -sTCP:LISTEN` to find the holder, ask the user, then stop it |
| app logs `ECONNREFUSED ... postgres:5432` briefly at boot | Normal for a few seconds while Postgres finishes starting | Wait — `depends_on: service_healthy` gates it; a problem only if it persists after postgres is `healthy` |
| SPA can't reach the API / CORS errors | Service not up, or SPA pointed at the wrong port | Confirm `:3000/health/readiness` is `200`; the SPA expects the service on `:3000` |
| Native dep (argon2 etc.) missing after install | `pnpm 11` didn't build it | Ensure it's approved in the `allowBuilds:` map in `pnpm-workspace.yaml`, then reinstall |
| `pnpm --filter service deploy` prompts / fails in the image build | pnpm 11 `deploy` needs `--legacy` and non-interactive `CI=true` | Both are already set in `apps/service/Dockerfile` — don't remove them |
