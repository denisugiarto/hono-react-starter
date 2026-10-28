# Development Progress

## Project / Feature

Starter template fullstack app: Hono + React + Vite + Bun + TailwindCSS + shadcn/ui + TypeScript,
ditambah PostgreSQL + Drizzle ORM + Better Auth + RBAC (admin / user) + shared schema (Zod) +
TanStack Query + React Hook Form + production hardening.
Lokasi: `/Users/user/Dev/hono-react-starter`

## Current Status

Production-ready (iterasi 3, 2026-10-28: JWT + RBAC permission) — lihat "Iterasi 2/3" di bawah.

## Goal

Template starter fullstack TypeScript siap pakai: satu perintah untuk dev (HMR React + API Hono),
jalur production (build + start), database PostgreSQL via Drizzle ORM, dan autentikasi Better Auth.

## Scope

Included:
- React SPA (Vite) di `src/` + komponen shadcn/ui
- API Hono di `src/server/` (routes `/api/*`)
- PostgreSQL + Drizzle ORM (schema, migrasi versioned, CRUD contoh)
- Better Auth (email/password, sesi cookie, tabel auth via migrasi)
- RBAC: plugin admin Better Auth, role `admin`/`user`, middleware requireAuth/requireAdmin, route admin contoh, seed akun admin
- Shared schema `src/shared/`: tipe & validasi Zod satu sumber utk frontend+backend
- Data fetching: TanStack Query (query + mutation, hooks di src/lib/api/)
- Form: React Hook Form + zodResolver (auth & notes)
- Production hardening: env fail-fast, rate limit auth (storage database), trustHost, logger, PORT env, migrasi otomatis saat start, graceful shutdown, cache headers
- Dev: `@hono/vite-dev-server` + adapter Bun (satu port, HMR)
- Prod: `vite build` → `dist/`, server Bun serve API + static + SPA fallback

Not included:
- OAuth provider (Google/GitHub) — tinggal tambah plugin Better Auth
- React Router (SPA fallback sudah disiapkan)
- Deployment platform config (dokumentasi saja)

## Assumptions

- Package manager & runtime: Bun (v1.2.19)
- PostgreSQL lokal via Homebrew (`postgresql@17`), database `hono_react_starter`
- Auth trust lokal untuk user macOS (DATABASE_URL tanpa password)
- Tidak perlu CORS karena frontend & API satu origin

## Open Questions

- Tidak ada (semua keputusan diambil dengan asumsi aman)

## Requirements

- `bun run dev` → satu dev server, HMR client + reload API
- `bun run db:generate` / `db:migrate` → migrasi Drizzle versioned
- Better Auth: sign-up, sign-in, get-session, sign-out bekerja (dev + prod)
- CRUD notes tersimpan di PostgreSQL
- `bun run build` + `bun run start` → production berfungsi

## Acceptance Criteria

- [x] `bunx tsc -b` sukses tanpa error
- [x] `bun run lint` tanpa error (2 warning wajar dari file shadcn)
- [x] Dev + Prod: `/api/health`, `/api/hello`, `/api/echo` JSON
- [x] CRUD notes: POST, GET, PATCH (done), DELETE + 404/400 handling
- [x] Migrasi: tabel `notes`, `user`, `session`, `account`, `verification` dibuat
- [x] Auth: sign-up (hash password di DB), sign-in, get-session via cookie, sign-out
- [x] Auth: password salah → `INVALID_EMAIL_OR_PASSWORD`; sign-out tanpa Origin → CSRF ditolak
- [x] RBAC: `/api/admin/users` tanpa login → 401; user biasa → 403; admin → 200 + daftar user
- [x] RBAC: kolom role/banned di tabel user; seed admin berhasil (admin@example.com role=admin)
- [x] Production: DATABASE_URL fail-fast di prod; BETTER_AUTH_SECRET ≥32 char divalidasi; trustHost aktif
- [x] Production: rate limit auth (25 percobaan → 2×401 + 23×429); logger; PORT env (3100) berfungsi
- [x] Production: `start` menjalankan migrasi otomatis; graceful shutdown (SIGTERM tutup pool DB)
- [x] Production: cache header asset immutable + index no-cache
- [x] Shared schema: validasi zod notes (400 VALIDATION_ERROR + detail field); client pakai tipe shared
- [x] Build prod: dist + asset + SPA fallback + API + auth + RBAC berfungsi
- [x] Data test dibersihkan (user test dihapus, admin seed tersisa)

## Plan

1. Scaffold `create-vite` react-ts ✅
2. Drizzle: install deps, schema, db client, drizzle.config, script migrasi ✅
3. Start PostgreSQL lokal + buat database ✅
4. Migrasi pertama (notes) + API CRUD notes + demo UI ✅
5. Better Auth: install, auth.ts (Drizzle adapter), generate schema auth ✅
6. Integrasi schema auth + migrasi kedua ✅
7. Mount handler `/api/auth/*` + client React + demo login ✅
8. Verifikasi dev + prod (API + auth + CRUD) ✅
9. RBAC: plugin admin, middleware, route admin, seed admin ✅
10. Shared schema `src/shared/` + zod + validasi server + tipe client ✅
11. TanStack Query (hooks API) + React Hook Form (form auth & notes) ✅
12. Production hardening (review → perbaikan) ✅
13. Dokumentasi: README + DEVELOPMENT_PROGRESS ✅

## Task Breakdown

| Task | Owner | Status | Notes |
| --- | --- | --- | --- |
| Drizzle setup | agent | Done | drizzle-orm 0.45, postgres 3.4, drizzle-kit 0.31 |
| PostgreSQL start | agent | Done | pg_ctl + LC_ALL fix (locale macOS) |
| Schema + migrasi | agent | Done | 2 migrasi: notes, auth tables |
| CRUD notes | agent | Done | routes/notes.ts + App demo |
| Better Auth | agent | Done | v1.6.26, `auth.handler` (bukan handlers) |
| Auth schema | agent | Done | CLI generate → auth-schema.ts |
| Client auth | agent | Done | better-auth/react + useSession |
| RBAC setup | agent | Done | plugin admin, middleware, route admin, seed |
| Shared schema | agent | Done | zod + src/shared (api/auth/notes) |
| TanStack Query | agent | Done | query-client + hooks notes/admin |
| React Hook Form | agent | Done | zodResolver, generik input/output |
| Prod hardening | agent | Done | env, rate limit, trustHost, logger, PORT, shutdown, cache |
| Verifikasi | agent | Done | curl semua endpoint dev+prod + rate limit + SIGTERM |
| Dokumen | agent | Done | README + progress |

## Files and Areas Touched

- `src/shared/` (baru) — api.ts, auth.ts (inkl. signIn/Up schema), notes.ts, index.ts
- `src/lib/query-client.ts` (baru) — QueryClient config
- `src/lib/api/notes.ts` (baru) — useNotes + mutations (zod parse)
- `src/lib/api/admin.ts` (baru) — useAdminUsers (enabled saat admin)
- `src/main.tsx` — QueryClientProvider
- `src/App.tsx` — RHF (auth + notes form), TanStack Query (health, notes, admin)
- `src/server/env.ts` (baru) — validasi env fail-fast
- `src/server/db/schema.ts` — notes + rate_limit (id pk) + re-export auth-schema
- `src/server/db/auth-schema.ts` — tabel auth (generate CLI)
- `src/server/db/index.ts` — client postgres.js + drizzle (fail-fast URL)
- `src/server/db/migrate.ts` — runner migrasi (fail-fast URL)
- `src/server/db/seed.ts` — seed akun admin
- `src/server/auth.ts` — Better Auth (admin plugin + rateLimit database + trustHost + secret validasi)
- `src/server/middleware/auth.ts` — requireAuth + requireAdmin (RBAC)
- `src/server/routes/notes.ts` — CRUD + validasi shared zod + kode error
- `src/server/routes/admin.ts` — list users → DTO AdminUser (iso dates)
- `src/server/index.ts` — logger, cache headers, SPA fallback, auto-serve Bun + PORT + graceful shutdown
- `src/lib/auth-client.ts` — createAuthClient + adminClient plugin
- `src/App.tsx` — tipe dari @/shared, kartu auth (badge role + panel admin) + kartu notes
- `vite.config.ts` — port dari env PORT
- `package.json` — start = migrate + serve; script db:seed
- `drizzle/` — migrasi 0000..0004 (0004 diperbaiki manual: pk id di rate_limit)
- `src/server/db/index.ts` — koneksi (readDatabaseUrl)
- `README.md`, `DEVELOPMENT_PROGRESS.md`

## Test Strategy

- TypeScript: `tsc -b` (strict)
- Lint: `oxlint`
- Smoke test curl (dev + prod): health/hello/echo, notes CRUD, auth flows
- DB: psql langsung cek tabel & data

## Test Results

- `tsc -b`: pass · `oxlint`: pass (2 warning shadcn)
- CRUD notes: POST 201, GET list, PATCH done, DELETE 200/404, validasi 400 ✓
- Auth: sign-up 200 + user di DB, sign-in 200 + cookie, get-session valid,
  sign-out 200 (dengan Origin), password salah → error, DB session count 0 ✓
- RBAC: 401 (tanpa login), 403 (user biasa), 200 (admin) di dev + prod ✓
- Rate limit: 25 percobaan sign-in → 2×401 (password salah) + 23×429 ✓
- Prod: PORT=3100 jalan, migrate otomatis saat start, SIGTERM → graceful shutdown (pool DB ditutup) ✓
- Cache: asset `immutable` 1 tahun, index `no-cache` ✓
- Validasi shared zod: POST notes `title:""` → 400 VALIDATION_ERROR + detail field ✓
- TanStack Query + RHF: typecheck bersih; form auth & notes pakai zodResolver; invalidateQueries refresh cache ✓
- Build prod: dist 425 kB JS (inkl. zod, better-auth, tanstack query, RHF) ✓
- Prod: auth ok, sign-up, notes, RBAC, SPA fallback ✓

## Risks and Blockers

- **Vite harus di runtime Bun** (`bunx --bun vite`) — sudah di-capture di script dev.
- **Locale macOS**: Postgres gagal start tanpa `LC_ALL` valid (`postmaster became multithreaded`) — perlu export saat start manual; brew services bisa gagal tanpa fix.
- **Better Auth v1.6**: pakai `auth.handler` (singular), sign-out butuh `Origin` header (CSRF — normal di browser). Client admin v1.6 tidak punya hook `useListUsers` — method admin via `authClient.admin.*`.
- **Bun v1.2 auto-serve**: default export `{ port, fetch }` otomatis di-serve Bun; jangan panggil `Bun.serve` manual (EADDRINUSE). Graceful shutdown hanya menutup pool DB.
- **Drizzle-kit ≠ auto-deteksi PK lama**: migrasi ganti PK `rate_limit` perlu edit manual (DROP CONSTRAINT `rate_limit_pkey`) — keterbatasan drizzle-kit.
- **Port 3000** kadang terpakai (VS Code) — Vite auto-increment.

## Decisions

- Arsitektur single dev server (`@hono/vite-dev-server`).
- Driver `postgres` (postgres.js) alih-alih `pg` — ringan & pas untuk Bun.
- Schema auth di-generate CLI Better Auth → `auth-schema.ts`, di-re-export dari `schema.ts` agar satu sumber schema untuk drizzle-kit.
- Branching dev/prod via `c.env.vite` agar kode sama jalan saat dieksekusi langsung Bun di prod.
- Alias `@/*` tanpa `baseUrl` (TS 6 mendeprekasi baseUrl).
- Data test dibersihkan setelah verifikasi agar starter dalam kondisi bersih.

## Iterasi 2 — Production readiness (2026-10-27)

Temuan audit dan perbaikan:

| Temuan | Perbaikan |
| --- | --- |
| Notes tanpa auth: siapa pun bisa baca/ubah/hapus semua catatan | Kolom `notes.user_id` (FK cascade + index, migrasi `0005`), `requireAuth` di semua route notes, setiap query dibatasi `user_id` → user lain dapat `404` |
| `trustHost: true` bukan opsi Better Auth (diabaikan diam-diam) | Diganti `baseURL` + `trustedOrigins` dari `BETTER_AUTH_URL`, `advanced.ipAddress.ipAddressHeaders` untuk IP asli di belakang proxy |
| `BETTER_AUTH_URL` tidak divalidasi di production | `readBaseUrl()`: wajib, URL valid, `https://` di production; `readPort()` divalidasi |
| Bug: `noteUpdateSchema = noteCreateSchema.partial()` tetap memakai default `content: ''` → PATCH `{done}` menghapus isi catatan | Schema update didefinisikan eksplisit; ada test regresi |
| `favicon.svg` dan file dist non-asset → index.html di production | `serveStatic` dist untuk semua file non-API (cache 1 jam), SPA fallback hanya untuk HTML |
| Tidak ada header keamanan, batas body, request id, cache no-store untuk API | `secureHeaders` (HSTS di prod), `bodyLimit` 1 MB → 413, `requestId`, `Cache-Control: no-store` untuk `/api/*` |
| `/api/health` tidak mengecek DB | `select 1` → `503 degraded` bila DB tidak bisa dihubungi |
| `POST /api/echo` body bukan JSON → 500 | → `400 INVALID_JSON` |
| `onError` tidak menangani `HTTPException` | Status asli dipakai; error lain → 500 generik + log request id |
| Seed memakai password default & mencetak password ke log | Wajib `ADMIN_EMAIL`/`ADMIN_PASSWORD` di production, min 8 char, password tidak dicetak, pool DB ditutup |
| Cache TanStack bocor antar sesi di browser yang sama | `removeQueries` notes/admin saat sign-out; query notes `enabled` hanya saat ada sesi |
| Tidak ada error boundary React | `ErrorBoundary` global di `main.tsx` |
| Tidak ada test | `bun test`: 26 test server (API, auth, RBAC, notes per-user, shared schema) + 4 test UI (happy-dom + Testing Library); DB test terpisah (`_test`) |
| Tidak ada Docker/CI, bukan repo git | `Dockerfile` multi-stage (non-root, HEALTHCHECK), `docker-compose.yml`, GitHub Actions (typecheck, lint, test, build, smoke prod, docker build); `git init` |
| `index.html lang="en"` padahal konten Indonesia | `lang="id"` |

Refactor kecil: `src/server/app.ts` (app Hono) dipisah dari `index.ts` (serve + shutdown) agar
test bisa mengimpor app tanpa membuka port; helper `request()` + `ApiError` di `src/lib/api/request.ts`.

Verifikasi iterasi 2:
- `tsc -b` (termasuk `tests/`) ✓ · `oxlint` ✓ (2 warning shadcn) · `bun run test` 30 pass ✓
- Build prod + smoke: health 200 + DB ok, header keamanan + HSTS, favicon 200 `image/svg+xml`,
  asset `immutable`, SPA fallback 200 `no-cache`, `/api/nope` 404 JSON, `/api/notes` 401,
  SIGTERM → pool DB ditutup ✓
- Dev server: `/@vite/client` ter-inject, modul TS dilayani, deep route 200, tanpa HSTS ✓
- Docker build **belum diverifikasi lokal** (docker tidak terpasang di mesin ini) — diverifikasi oleh job CI `docker`.

## Iterasi 3 — JWT + RBAC berbasis permission (2026-10-28)

- **JWT**: plugin `jwt` Better Auth (EdDSA, exp 15 menit, `iss`/`aud` = baseURL, `definePayload`
  → `id/email/name/role`), tabel `jwks` (migrasi `0006`), endpoint `GET /api/auth/token` & `/api/auth/jwks`.
- **Bearer**: plugin `bearer` — session token dari header `set-auth-token` bisa dipakai sebagai bearer.
- **Middleware** (`src/server/middleware/auth.ts`): `resolveUser()` memprioritaskan
  `Authorization: Bearer <JWT>` (verifikasi via `auth.api.verifyJWT`, payload divalidasi
  `jwtPayloadSchema`) lalu fallback sesi. `requireAuth`, `requireRole(...)`,
  `requirePermission({...})`, `requireAdmin`. `c.get('user')` bertipe `AuthUser` (+ `authMethod`).
- **RBAC permission**: `src/shared/permissions.ts` (`createAccessControl`, role `user`/`admin`,
  `can()`), dipakai plugin admin (`ac`, `roles`), route notes (per aksi), admin (`user:list`), dan UI.
- **UI**: tombol "Buat token" (demo JWT) dan panel admin dikontrol `can(role, { user: ['list'] })`.
- **Test**: +15 (JWKS, penerbitan token, bearer JWT/session-token, token dipalsukan → 401,
  RBAC via JWT, token lama tetap bawa role lama, unit `can()`); total 45 server + 4 UI.
- Keterbatasan (didokumentasikan): JWT stateless → perubahan role/ban berlaku pada token
  berikutnya (≤ 15 menit); untuk pencabutan instan gunakan session token.

## Iterasi 4 — Coverage ≥ 90 % (2026-10-28)

- `bunfig.toml`: `coverage = true`, `coverageThreshold = { lines = 0.9, functions = 0.9 }`
  (Bun 1.2.19 menerapkan ambang per file; diverifikasi eksperimen), `coveragePathIgnorePatterns`
  untuk `tests/**`, schema Drizzle, dan `src/components/ui/**`.
- Refactor agar jalur production dapat diuji: `createApp({ isProd, distDir, silent, extend })`,
  `createApiRoutes({ ping })`, `env.ts` membaca `process.env` saat dipanggil.
- Test baru: `app.test.ts` (static/SPA/HSTS/Vite transform/onError/HTTPException/requireRole),
  `env.test.ts` (semua validator), `api` 503, notes id non-UUID & body rusak,
  `app-interactions.test.tsx` (auth, JWT, hello, CRUD notes, admin, health error),
  `request.test.ts`, klik "Muat ulang" di ErrorBoundary.
- Bug yang ditemukan test dan diperbaiki:
  - `/` dan `/index.html` di production dilayani serveStatic tanpa `Cache-Control: no-cache`.
  - `/assets/<tidak-ada>` jatuh ke index.html lalu diberi header `immutable` (HTML ter-cache
    1 tahun) → kini 404 JSON.
  - `PATCH/DELETE /api/notes/<bukan-uuid>` → 500 dari Postgres → kini 404.
- Hasil: server 66 test, UI 26 test; semua file yang dihitung 100 % baris & fungsi.

## Iterasi 5 — Rate limit API umum (2026-10-28)

- `hono-rate-limiter` di `/api/*` (lewati `/api/auth/*` & `/api/health`), 100 req/menit/IP
  default, env `API_RATE_LIMIT_MAX` / `API_RATE_LIMIT_WINDOW` (`0` = nonaktif; test env nonaktif).
- Store PostgreSQL `DrizzleRateLimitStore` (tabel `api_rate_limit`, migrasi `0007`): UPSERT
  atomik, dibagi antar instance, cleanup baris kedaluwarsa ±1% request.
- `clientIp()` konsisten dengan Better Auth (`cf-connecting-ip` → `x-real-ip` → `x-forwarded-for`
  → alamat koneksi Bun → `unknown`).
- `createApp({ rateLimit })` untuk konfigurasi/menonaktifkan; test: store (increment, expiry,
  cleanup, prefix), clientIp, middleware (429 + header, per-IP, skip path, nonaktif).

## Iterasi 6 — Envelope respons standar (2026-10-28)

- `src/shared/api.ts`: `{ success: true, data, message? }` / `{ success: false, code, message, details? }`,
  `API_ERROR_CODES`, `apiResponseSchema` (discriminated union) untuk client.
- `src/server/lib/response.ts`: `ok()`, `fail()`, `errorBody()`; dipakai semua route, middleware
  auth, rate limiter, bodyLimit, 404 API, `onError` (500 menyertakan `details.requestId`).
- Client: `requestEnvelope()` + `request()`; `ApiError` selalu punya `code`; `useCreateNote`
  mengembalikan envelope → UI menampilkan `message` ("Catatan dibuat"). Health/hello di `App.tsx`
  memakai `request()` + schema shared (`hello.greeting`).
- Test diperbarui (helper `readData`), total 109 (81 server + 28 UI), coverage tetap 100 % per file.
- `/api/auth/*` tidak diubah (format Better Auth).

## Iterasi 7 — Logging terstruktur & tracing error (2026-10-28)

- `src/server/lib/logger.ts`: Logger tanpa dependency (json/pretty, level, child, sink), `serializeError`
  (name/message/stack/cause + code/detail/constraint/table Postgres), `createCapturingSink` untuk test.
- `middleware/request-log.ts`: satu baris per request (requestId, method, path, status, durationMs,
  ip, userId, userAgent; level by status) + `c.get('log')` (child ber-requestId). Menggantikan `hono/logger`.
- `app.onError`: `unhandled error` (error, stack + konteks) / `http exception` (warn); `details.requestId`
  di respons 500 = requestId di log. `types.ts` (`AppEnv`) agar `c.get('log')`/`c.get('user')` bertipe.
- `index.ts`: log start/stop terstruktur, `unhandledRejection` & `uncaughtException`.
- Client: `describeError()` menampilkan `(ref: <requestId>)` pada error 500 di UI.
- Env: `LOG_LEVEL`, `LOG_FORMAT` (+ validasi, test). Total 125 test, coverage 100 % per file.

## Iterasi 8 — Monorepo Nx: pisah frontend & backend (2026-10-28)

- Struktur baru: `apps/api` (Hono/Bun, `@hono-react-starter/api`), `apps/web` (React/Vite,
  `@hono-react-starter/web`), `packages/shared` (`@hono-react-starter/shared`, `exports` ke sumber TS —
  tanpa build). Bun workspaces + Nx 24 (`nx.json`: cache, `namedInputs`, `dependsOn`, `continuous` dev).
- Dev tidak lagi memakai `@hono/vite-dev-server`: `bun run dev` = `nx run-many -t dev` → api
  (`bun --watch`, :3000) + web (Vite :5173, proxy `/api`). Better Auth menerima origin Vite lewat
  env baru `TRUSTED_ORIGINS` (`readTrustedOrigins()`, default dev `http://localhost:5173`).
- Production: api menyajikan `apps/web/dist` (`defaultDistDir()` relatif file, override `WEB_DIST_DIR`);
  di mode dev route non-API → 404 JSON. `AppEnv` tanpa binding Vite. Folder migrasi relatif file
  (`db/migrations-dir.ts`) agar tidak bergantung cwd.
- Alias `@/*` dan `@hono-react-starter/shared` didefinisikan di `tsconfig.base.json` — Bun tidak membaca
  `paths` dari tsconfig anak saat `extends` (dan `baseUrl` sudah deprecated di TS 6).
- Coverage per proyek (`bunfig.toml` masing-masing); shared dikecualikan saat dimuat api/web.
- Dockerfile multi-stage untuk workspace (manifest → install → `bun run build` → runtime
  `apps/api` + `apps/web/dist`), `.dockerignore`, CI memakai `nx run-many` + `nrwl/nx-set-shas`.
- `.env` pindah ke `apps/api/.env` (Bun memuat dari cwd proyek). Total 131 test (8 shared + 93 api
  + 30 web), coverage 100 % per file, smoke dev (proxy + sign-up/sign-in/notes) dan prod lolos.

## Iterasi 9 — Frontend: shadcn/ui lengkap + struktur proyek menengah (2026-10-28)

- `apps/web/src` disusun berbasis fitur: `app/` (providers, routes, router), `pages/`, `features/{auth,notes,admin,system}`
  (api + components + hooks + index), `components/{ui,layout,common}`, `hooks/`, `lib/`, `config/` (site, paths,
  navigation), `styles/globals.css`. `App.tsx` monolit (592 baris) dipecah.
- React Router 8 (library mode): `/`, `/login`, `/notes`, `/settings/api-token`, `/admin/users`, 404, errorElement;
  guard `RequireAuth` (redirect + `state.from`) dan `RequirePermission` (403).
- shadcn/ui: tambah alert, alert-dialog, avatar, dialog, dropdown-menu, field, select, sheet, sonner, switch, table,
  tabs, tooltip. CLI menulis ke `apps/web/apps/web/...` (deteksi root monorepo) → dipindahkan; import `cn` diarahkan ke
  `@/lib/utils` (paket `cn` & `next-themes` dihapus); `sonner.tsx` memakai `useTheme` internal.
- Layout: `AppShell`, `SiteHeader` (MainNav, MobileNav Sheet, ThemeToggle, UserMenu dropdown / tombol Masuk),
  `SiteFooter`. Tema light/dark/system (`lib/theme.ts`, `ThemeProvider`, localStorage, ikut perubahan OS).
- Form memakai `Field`/`FieldLabel`/`FieldError` shadcn + React Hook Form; toast sonner untuk sukses/keluar.
- Test web ditulis ulang per area (`tests/app`, `features`, `components`, `lib`, `mocks`): `renderAt(path)` dengan
  `createMemoryRouter`, mock auth-client (`asGuest/asUser/asAdmin`) + mock fetch in-memory. Catatan Bun: `mock.module`
  harus sebelum `await import()` modul app; hook `beforeEach` tidak bisa dipanggil dari helper (dipanggil di file test).
- 57 test web (sebelumnya 30), coverage 100 % per file. README: bagian "Struktur Frontend" dan "shadcn/ui".

## Iterasi 10 — Alur akun enterprise + audit log + health live/ready (2026-10-29)

- **Mailer** tanpa dependency (`lib/mailer.ts`): `ConsoleMailer` (dev, log), `MemoryMailer` (test), `ResendMailer`
  (HTTP API). Env `MAIL_PROVIDER` / `MAIL_FROM` / `RESEND_API_KEY`; template Indonesia di `lib/emails.ts`.
- **Better Auth** (`auth.ts` → `createAuth(options)`): `emailVerification` (sendOnSignUp/SignIn, auto sign-in,
  24 jam), `sendResetPassword` (1 jam, sesi lama dicabut), `AUTH_REQUIRE_EMAIL_VERIFICATION` (fail-fast di
  production bila provider bukan resend), plugin `twoFactor` (TOTP + backup code; tabel `two_factor`,
  kolom `user.two_factor_enabled`). Migrasi `0008_account_security_audit`.
- **Audit log**: tabel `audit_log` (append-only, tanpa FK), `lib/audit.ts` (`recordAudit`, `auditFromContext`,
  fail-open + log error), `lib/request-context.ts` (AsyncLocalStorage: requestId/ip/UA dari `requestLog`),
  `auth-audit.ts` membungkus `auth.handler` (mencatat sukses & gagal untuk sign-in/out, verifikasi email,
  reset/ganti password, 2FA, aksi admin — pelaku dari sesi sebelum aksi atau `user` di respons), audit di
  route notes. `GET /api/admin/audit-logs` (permission `audit:list`, filter action/actorId/success,
  paginasi cursor `at`). Shared: `packages/shared/src/audit.ts`.
- **Health**: `/api/health/live` (tanpa DB) dan `/api/health/ready` (DB; `/api/health` alias). Dockerfile
  HEALTHCHECK + CI smoke diperbarui; rate limit melewati `/api/health/*`.
- **Frontend**: `auth-client` + `twoFactorClient`; halaman `/forgot-password`, `/reset-password`,
  `/verify-email`, `/login/two-factor`, `/settings/security` (kartu verifikasi email, 2FA dengan QR
  `qrcode.react` + secret + backup code, ganti password), `/admin/audit-logs` (tabel + filter + "Muat lebih
  banyak" via `useInfiniteQuery`). `AuthForm` menangani `twoFactorRedirect`, `EMAIL_NOT_VERIFIED` (kirim
  ulang), dan daftar tanpa sesi (`token: null`). Nav/menu: Keamanan, Audit (admin).
- Test: api 129 (+36: env mail, mailer, emails, audit lib, `account.test.ts` alur lengkap termasuk TOTP
  nyata via `@better-auth/utils`, audit-logs endpoint, health), web 80 (+23), shared 14 (+6). Coverage
  per file tetap ≥ 90 % (mayoritas 100 %).
- Catatan: hook `after` Better Auth tidak berjalan saat endpoint melempar error, karena itu audit auth
  dilakukan di lapisan Hono. `Button render={<Link/>}` memicu peringatan Base UI `nativeButton` di
  console test — `nativeButton={false}` mengubah role link menjadi button, jadi peringatan dibiarkan.

## Iterasi 11 — Skill Claude Code untuk repo (2026-10-29)

- `.claude/skills/{adding-feature,db-migrations,writing-tests,auditing-actions,adding-shadcn-component,verifying-changes}/SKILL.md`
  — panduan alur kerja khusus repo (aturan yang tidak terlihat dari kode). Diuji dengan subagent: baseline tanpa
  skill (ragu soal `exports` shared, bentuk mock API web, wildcard permission) → skill direvisi → uji ulang dengan skill.
- README: bagian "Skill untuk agen AI (Claude Code)".

## Iterasi 12 — Kesiapan tester: seed demo, Playwright E2E, OpenAPI, staging (2026-10-29)

- **Seed demo**: `packages/shared/src/demo.ts` (akun admin/user/totp/banned, catatan contoh, kode cadangan
  tetap — konstanta murni agar bisa diimpor Playwright), `apps/api/src/db/demo.ts` (`seedDemo()` idempoten;
  2FA dipasang langsung ke tabel `two_factor` dengan `symmetricEncrypt` Better Auth agar secret TOTP tetap),
  entry `seed-demo.ts` (`bun run db:seed:demo`; ditolak di production tanpa `ALLOW_DEMO_SEED`).
- **OpenAPI**: `apps/api/src/openapi.ts` — dokumen 3.0 dari schema Zod shared (`z.toJSONSchema`), ringkasan
  endpoint Better Auth, `GET /api/openapi.json` (cache) + `GET /api/docs` (Scalar via CDN); `API_DOCS_ENABLED`.
- **E2E**: proyek Nx `apps/e2e` (Playwright, Chromium). `webServer` menjalankan `apps/api` dengan
  `SERVE_WEB_DIST=true` (opsi baru `createApp({ serveWeb })`, dipisah dari HSTS/`isProd`), migrasi + seed demo,
  DB test, port 3199. 18 skenario: smoke/404/docs, daftar, login salah/benar/banned, redirect guard, lupa
  password, catatan CRUD + validasi, 2FA TOTP (kode dari secret tetap), admin users/audit + filter, RBAC 403/401.
  CI: job `e2e` (artefak laporan saat gagal). `data-testid` di form auth, 2FA, catatan, header/menu, tabel admin.
- **Rate limit Better Auth** kini dari env `AUTH_RATE_LIMIT_MAX/WINDOW` (`createAuth({ rateLimit })`),
  `/get-session` dikecualikan lewat `customRules` — ditemukan E2E: SPA memanggil get-session berulang dari
  satu IP sehingga 20/menit membuat sesi "hilang" (429). Aturan bawaan sign-in 3/10 detik tetap berlaku.
- **Bug nyata yang terungkap E2E**: `signIn.email` dikirim dengan `callbackURL` → Better Auth membalas
  `{ redirect: true, url }` dan client memindahkan browser ke `/verify-email` setelah login. Test unit tidak
  menangkapnya karena auth-client di-mock. Diperbaiki: callbackURL hanya untuk sign-up/kirim ulang.
- **Staging**: `docker-compose.staging.yml` (Caddy HTTPS otomatis + app production + db + service `seed`),
  `deploy/staging/{Caddyfile,.env.staging.example}`. Dockerfile menyalin `apps/e2e/package.json` (workspace).
- **Dokumentasi**: `docs/QA.md` (lingkungan, akun demo, cara baca email di log, OpenAPI, checklist skenario,
  tabel `data-testid`, E2E, pelaporan bug), README (Fitur, Struktur, Env, Script, OpenAPI, Testing, Staging),
  `.env.example`, skill `verifying-changes` / `writing-tests` / `adding-feature` diperbarui.
- Test: api 148 (+19), web 80, shared 15 (+1), e2e 18. Coverage per file tetap ≥ 90 %.

## Iterasi 13 — Caching backend & frontend (2026-10-29)

- **Cookie cache sesi** Better Auth: `session.cookieCache` dari `AUTH_SESSION_CACHE_SECONDS` (default 60,
  `createAuth({ sessionCacheSeconds })`); `tests/setup.ts` memaksa `0` untuk instance utama karena banyak test
  mengubah role/sesi langsung di DB; perilaku cache diuji di `tests/session-cache.test.ts`.
- **Cache aplikasi**: `lib/cache.ts` — interface `Cache`, `MemoryCache` (TTL, FIFO, `maxEntries`), `RedisCache`
  (`Bun.RedisClient`, JSON, prefix, fail-open dengan warn), `createCache(config, { redisClient })`, helper
  `cached()`; singleton `src/cache.ts`; env `CACHE_PROVIDER` / `REDIS_URL`.
- **JWT**: `verifyJwtCached()` di `middleware/auth.ts` — hasil verifikasi disimpan dengan key `jwt:sha256(token)`
  sampai `exp` (maks 15 menit).
- **ETag**: `middleware/cache-control.ts` `revalidate()` = `etag()` + `Cache-Control: private, no-cache` untuk
  GET `/api/notes`, `/api/admin/users`, `/api/admin/audit-logs` → 304 bila tak berubah; respons gagal tetap `no-store`.
- **Frontend**: `useToggleNote` / `useDeleteNote` optimistic (`onMutate` snapshot → `onError` rollback + toast →
  `onSettled` invalidate); mock API punya `fail.update` / `fail.delete`.
- Dokumentasi: README bagian "Caching" (tabel lapisan, cara pakai `cached()`, alasan tidak memakai persistensi
  storage), Env, `.env.example`, `docker-compose.yml` (service redis opsional).
- Test: api 161 (+13), web 82 (+2), shared 15, e2e 18.

## Next Steps

- OAuth Google/GitHub atau SSO OIDC (plugin Better Auth).
- OpenTelemetry (tracing/metrics) + Sentry.
- E2E: alur reset password & verifikasi email lewat tautan (butuh inbox uji, mis. endpoint `memory` khusus staging).
- Hygiene repo: LICENSE, CONTRIBUTING, SECURITY.md, CODEOWNERS, Renovate, scan dependensi di CI.
- Content-Security-Policy ber-nonce di production.

## Final Result

Starter lengkap & terverifikasi di `/Users/user/Dev/hono-react-starter`.
Jalankan: `cp apps/api/.env.example apps/api/.env && createdb hono_react_starter && bun install && bun run db:migrate && bun run db:seed && bun run dev` (web http://localhost:5173, api http://localhost:3000)
