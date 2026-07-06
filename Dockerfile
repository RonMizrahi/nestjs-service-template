# --- build: compile TS and prune dev deps ---
# alpine (musl) in BOTH stages — native modules (argon2) must be installed on
# the same libc they run on; argon2 ships linux-x64 musl prebuilds
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# --- runtime: alpine, nonroot user ---
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
# OTel preload first, then the app (same as npm run start:prod)
CMD ["node", "--require", "./dist/tracing", "dist/main"]
