# --- build: install the pnpm workspace, compile TS, emit a self-contained prod bundle ---
# alpine (musl) in BOTH stages — native modules (argon2) must run on the same libc
# they were built against; argon2 ships linux-x64 musl prebuilds.
# NOTE: the build context is the REPO ROOT (see compose.yaml build.context) so the
# whole workspace (pnpm-lock.yaml, pnpm-workspace.yaml, packages/*) is available.
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter service build
# `deploy` produces a symlink-free bundle at /app: the service's published files
# ("files": ["dist"] in its package.json) + production-only node_modules.
RUN pnpm --filter service deploy --prod /app

# --- runtime: alpine, nonroot user ---
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
USER node
EXPOSE 3000
# OTel preload first, then the app (same as `pnpm start:prod`)
CMD ["node", "--require", "./dist/tracing", "dist/main"]
