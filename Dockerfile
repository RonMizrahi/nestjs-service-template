# --- build: compile TS and prune dev deps ---
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# --- runtime: distroless (no shell, no package manager), nonroot user ---
# debian13 is the maintained base for Node 24 (debian12 variant is deprecated/frozen);
# glibc forward-compat: building on node:24-slim (bookworm) is safe for a trixie runtime
FROM gcr.io/distroless/nodejs24-debian13:nonroot
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
# distroless ENTRYPOINT is node — these are node's args (OTel preload, then the app)
CMD ["--require", "./dist/tracing", "dist/main"]
