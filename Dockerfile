# syntax=docker/dockerfile:1
# Multi-stage build: install → build client → runtime ramping.
# Jalankan: docker build -t hono-react-starter . && docker run -p 3000:3000 --env-file .env hono-react-starter

FROM oven/bun:1.2 AS base
WORKDIR /app

# --- deps: semua dependency (termasuk dev) untuk build ---------------------
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- build: typecheck + vite build → dist/ ----------------------------------
FROM deps AS build
COPY . .
RUN bun run build

# --- prod-deps: hanya dependency runtime ------------------------------------
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# --- runtime -----------------------------------------------------------------
FROM oven/bun:1.2-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY drizzle ./drizzle
COPY src/server ./src/server
COPY src/shared ./src/shared

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Migrasi otomatis lalu serve (lihat script "start")
CMD ["bun", "run", "start"]
