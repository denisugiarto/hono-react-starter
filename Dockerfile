# syntax=docker/dockerfile:1
# Multi-stage build untuk monorepo (Nx + Bun workspaces):
#   deps → build (apps/web → dist) → prod-deps → runtime (apps/api menyajikan apps/web/dist)
# Jalankan: docker build -t hono-react-starter . && docker run -p 3000:3000 --env-file apps/api/.env hono-react-starter

FROM oven/bun:1.2 AS base
WORKDIR /app

# --- deps: semua dependency (termasuk dev) untuk build --------------------
FROM base AS deps
# Hanya manifest workspace agar layer ini ter-cache selama dependency tidak berubah.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
# --ignore-scripts: dependency transitif (better-sqlite3 dari CLI Better Auth)
# punya skrip native yang gagal di image; app ini tidak memakai SQLite.
RUN bun install --frozen-lockfile --ignore-scripts

# --- build: vite build apps/web → apps/web/dist (lewat Nx) -----------------
FROM deps AS build
COPY . .
ENV NX_DAEMON=false
RUN bun run build

# --- prod-deps: hanya dependency runtime (seluruh workspace) ----------------
FROM base AS prod-deps
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile --production --ignore-scripts

# --- runtime -----------------------------------------------------------------
FROM oven/bun:1.2-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# node_modules berisi symlink workspace (@hono-react-starter/* → apps/*, packages/*),
# jadi struktur folder harus dipertahankan.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json apps/api/drizzle.config.ts apps/api/
COPY apps/api/drizzle ./apps/api/drizzle
COPY apps/api/src ./apps/api/src
COPY --from=build /app/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/api
USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Migrasi otomatis lalu serve (lihat script "start" di apps/api/package.json)
CMD ["bun", "run", "start"]
