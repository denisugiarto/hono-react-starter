# Hono + React Fullstack Starter

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Bun](https://img.shields.io/badge/Runtime-Bun-f9f1e1)
![Hono](https://img.shields.io/badge/Backend-Hono%204-e36002)
![React](https://img.shields.io/badge/Frontend-React%2019-61dafb)
![Drizzle](https://img.shields.io/badge/ORM-Drizzle-c5f74f)
![Better Auth](https://img.shields.io/badge/Auth-Better%20Auth-8b5cf6)

Template starter fullstack **TypeScript** — monorepo **Nx** dengan frontend dan backend terpisah
(`apps/web`, `apps/api`) plus paket schema bersama (`packages/shared`), siap production.

| Layer | Teknologi |
| --- | --- |
| Monorepo | Nx + Bun workspaces (`apps/web`, `apps/api`, `packages/shared`) |
| Frontend | React 19 + Vite (`apps/web`) |
| Backend | Hono 4 (Web Standard, fetch-based) (`apps/api`) |
| Runtime | Bun |
| Database | PostgreSQL + Drizzle ORM |
| Autentikasi | Better Auth: sesi cookie + JWT (bearer) + RBAC berbasis permission |
| Routing | React Router (library mode) |
| Data fetching | TanStack Query (React Query) |
| Form | React Hook Form + Zod |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Bahasa | TypeScript (strict) |

## Fitur

- **Frontend & backend terpisah, satu perintah** — `bun run dev` (Nx) menjalankan `apps/api` (`bun --watch`, port 3000) dan `apps/web` (Vite + HMR, port 5173) sekaligus; Vite memproxy `/api` ke backend sehingga cookie sesi tetap same-origin. Di production, API menyajikan hasil build `apps/web/dist`.
- **Nx** — task graph + cache (`typecheck`, `lint`, `test`, `build`), `nx affected` untuk CI, `nx graph` untuk melihat dependensi antar proyek.
- **Database terpasang** — Drizzle ORM + driver `postgres` (postgres.js), schema di `apps/api/src/db/`, migrasi versioned di `apps/api/drizzle/`.
- **Autentikasi siap pakai** — Better Auth: sign-up / sign-in email-password, sesi via cookie, tabel auth dibuat lewat migrasi.
- **Alur akun lengkap** — verifikasi email (opsional wajib via `AUTH_REQUIRE_EMAIL_VERIFICATION`), lupa/reset password, ganti password, **2FA TOTP** + backup code (aplikasi authenticator, QR di halaman Keamanan). Email lewat `Mailer` tanpa dependency: `console` (dev), `memory` (test), `resend` (produksi) — ganti provider di satu file.
- **Audit log** — tabel `audit_log` append-only: sign-in/out (termasuk yang gagal), reset password, 2FA, aksi admin, dan CRUD catatan, lengkap dengan `requestId`, IP, user-agent. Endpoint `GET /api/admin/audit-logs` (permission `audit:list`) + halaman admin dengan filter & paginasi cursor.
- **JWT untuk API client** — `GET /api/auth/token` menerbitkan JWT (EdDSA, 15 menit) yang diverifikasi stateless lewat JWKS (`/api/auth/jwks`). Semua route API menerima sesi cookie **atau** `Authorization: Bearer <jwt>`.
- **RBAC berbasis permission** — role `admin` / `user` dipetakan ke permission (`packages/shared/src/permissions.ts`, dipakai server & client). Middleware `requireAuth` / `requireRole(...)` / `requirePermission({...})`; akun admin via `bun run db:seed`.
- **Shared schema** — paket `@hono-react-starter/shared` (`packages/shared`) berisi tipe & validasi Zod dipakai frontend DAN backend (satu sumber kebenaran, tanpa drift).
- **Data fetching & form** — TanStack Query untuk state server, React Hook Form + `zodResolver` untuk form.
- **Notes per-user** — contoh resource yang wajib login dan dibatasi ke pemiliknya (`user_id` + `requireAuth`).
- **Caching berlapis** — aset ber-hash `immutable`, `index.html` `no-cache`, API `no-store` kecuali daftar besar yang memakai **ETag + `private, no-cache`** (304 bila tak berubah); **cookie cache sesi** Better Auth (tanpa query DB per request), **cache aplikasi** (`Cache` interface: memory / Redis bawaan Bun) dipakai untuk hasil verifikasi JWT; di frontend TanStack Query dengan `staleTime` + **optimistic update** (rollback otomatis saat gagal).
- **Production hardening** — env fail-fast (secret, `https://` origin), header keamanan + **Content-Security-Policy**, batas ukuran body, request ID, rate limiting API & auth, **lockout per akun** setelah password salah berulang, anti-enumerasi email saat daftar, IP klien hanya dari proxy tepercaya (`TRUST_PROXY`), health check terpisah (`/api/health/live` & `/api/health/ready`), graceful shutdown, migrasi otomatis saat start, cache header asset, gerbang `bun audit` di CI + Dependabot.
- **Test otomatis** — `bun test`: integrasi API (auth, RBAC, notes) terhadap database test + test komponen React (happy-dom + Testing Library); **Playwright E2E** (`apps/e2e`) di browser asli terhadap build production + akun demo.
- **Siap untuk tester** — `bun run db:seed:demo` membuat akun demo (admin, user dengan catatan, akun 2FA dengan secret tetap, akun diblokir), dokumentasi **OpenAPI** dari schema Zod (`/api/openapi.json` + UI `/api/docs`), selector `data-testid` konsisten, panduan QA (`docs/QA.md`), dan stack **staging** HTTPS (`docker-compose.staging.yml`, Caddy).
- **Docker & CI** — `Dockerfile` multi-stage, `docker-compose.yml` (app + PostgreSQL), GitHub Actions (typecheck, lint, test, build, smoke test, docker build).
- **Frontend terstruktur** — React Router + folder berbasis fitur (`app/`, `pages/`, `features/`, `components/{ui,layout,common}`, `hooks/`, `lib/`, `config/`), header dengan navigasi (desktop + Sheet mobile), menu pengguna, tema gelap, toast (sonner).
- **shadcn/ui lengkap** — 22 komponen (Button, Card, Field, Dialog, Sheet, DropdownMenu, Table, Tabs, Tooltip, Avatar, Alert, Select, Switch, Sonner, …) di atas Base UI; tambah lagi dengan `bunx shadcn add`.

## Struktur

Monorepo Nx dengan Bun workspaces. Tiap proyek punya `package.json`, `tsconfig.json`,
dan `bunfig.toml` sendiri; Nx membaca script `package.json` sebagai target.

```
hono-react-starter/
├── nx.json                 # Konfigurasi Nx: cache, inputs, dependsOn antar target
├── package.json            # Root: workspaces + script `nx run-many` (dev, build, test, …)
├── tsconfig.base.json      # Opsi TS bersama + alias (@/*, @hono-react-starter/shared)
├── Dockerfile              # Image production (multi-stage, oven/bun) — build web, serve lewat api
├── docker-compose.yml      # Stack lokal: app + PostgreSQL
├── docker-compose.staging.yml # Staging tester: Caddy (HTTPS) + app + db + seed demo (deploy/staging/)
├── docs/QA.md              # Panduan tester: akun demo, skenario, selector, E2E
├── .github/workflows/ci.yml# CI: audit, nx run-many (typecheck, lint, test, build), smoke, e2e, docker
├── .github/dependabot.yml  # PR pembaruan dependensi mingguan (bun, actions, docker)
├── scripts/audit.ts        # Gerbang bun audit: gagal bila advisory high/critical mengenai versi terpasang
│
├── apps/
│   ├── api/                # ⚙️ Backend Hono (Bun) — @hono-react-starter/api
│   │   ├── .env.example    #   Env backend (DATABASE_URL, BETTER_AUTH_*, …) → salin ke .env
│   │   ├── drizzle.config.ts
│   │   ├── drizzle/        #   Migrasi SQL versioned (di-generate)
│   │   ├── bunfig.toml     #   Coverage ≥ 90 % per file
│   │   ├── src/
│   │   │   ├── index.ts    #   Entry: serve + graceful shutdown
│   │   │   ├── app.ts      #   createApp(): middleware, API, auth, static apps/web/dist, SPA fallback
│   │   │   ├── auth.ts     #   createAuth(): Better Auth (admin+ac, bearer, jwt, two-factor, email verif, reset password)
│   │   │   ├── auth-audit.ts # Pembungkus auth.handler → audit_log (sign-in/out, reset, 2FA, aksi admin)
│   │   │   ├── auth-guards.ts # Lockout per akun (sign_in_lockout) + anti-enumerasi email saat daftar
│   │   │   ├── openapi.ts  #   Dokumen OpenAPI dari schema shared + /api/openapi.json, /api/docs (Scalar)
│   │   │   ├── mailer.ts   #   Singleton Mailer (MAIL_PROVIDER: console | memory | resend)
│   │   │   ├── cache.ts    #   Singleton Cache (CACHE_PROVIDER: memory | redis)
│   │   │   ├── env.ts      #   Validasi environment variables (fail-fast)
│   │   │   ├── types.ts    #   AppEnv: requestId, log, user
│   │   │   ├── lib/        #   logger, response (ok/fail), mailer, emails (template), audit, request-context, cache
│   │   │   ├── middleware/ #   auth (requireAuth/Role/Permission + cache JWT), request-log, rate-limit, cache-control (ETag)
│   │   │   ├── routes/     #   api.ts (health live/ready, hello), notes.ts, admin.ts (users, audit-logs)
│   │   │   └── db/         #   index.ts, schema.ts (+ audit_log), auth-schema.ts (+ two_factor), migrate.ts, seed.ts, demo.ts + seed-demo.ts
│   │   └── tests/          #   Test integrasi API (bun test, DB test) + fixtures/build
│   │
│   ├── e2e/                # 🧪 Playwright — @hono-react-starter/e2e (playwright.config.ts, tests/*.spec.ts)
│   │
│   └── web/                # 🎨 Frontend React + Vite — @hono-react-starter/web
│       ├── index.html      #   Shell SPA
│       ├── vite.config.ts  #   React + Tailwind + alias @ + proxy /api → apps/api
│       ├── components.json #   Konfigurasi shadcn/ui (style base-nova, css src/styles/globals.css)
│       ├── bunfig.toml     #   Coverage ≥ 90 % per file
│       ├── public/
│       ├── src/            #   Struktur berbasis fitur — lihat "Struktur Frontend" di bawah
│       │   ├── main.tsx    #   Entry: Providers + RouterProvider
│       │   ├── app/        #   providers.tsx, routes.tsx, router.tsx
│       │   ├── pages/      #   Satu komponen per route (tipis, menyusun fitur)
│       │   ├── features/   #   auth (form, 2FA, reset, keamanan), notes, admin (users, audit-logs), system
│       │   ├── components/ #   ui/ (shadcn), layout/ (header, nav, shell), common/ (state kosong/error/loading)
│       │   ├── hooks/      #   use-theme, use-document-title, use-visible-nav
│       │   ├── lib/        #   api/request, auth-client, query-client, theme, utils
│       │   ├── config/     #   site.ts, paths.ts, navigation.ts
│       │   └── styles/     #   globals.css (Tailwind v4 + tema shadcn)
│       └── tests/          #   Test komponen (happy-dom + Testing Library): app/, features/, components/, lib/, mocks/
│
└── packages/
    └── shared/             # ⭐ @hono-react-starter/shared — dipakai api & web
        ├── src/
        │   ├── api.ts      #   Envelope respons (success/data/message, code), health live/ready, hello
        │   ├── audit.ts    #   AUDIT_ACTIONS, auditLogSchema, auditLogQuerySchema (paginasi cursor)
        │   ├── auth.ts     #   AdminUser, JwtPayload, schema form (sign-in/up, reset, ganti password, TOTP)
        │   ├── permissions.ts # RBAC: statements, roles, can()
        │   ├── notes.ts    #   Note + schema create/update
        │   ├── demo.ts     #   Akun & data demo (seed, test API, Playwright) — bukan production
        │   └── index.ts    #   Barrel export
        └── tests/
```

Aturan dependensi (diverifikasi Nx): `api → shared`, `web → shared`, `e2e → api, web, shared`
(hanya saat runtime/build, tanpa impor kode api). `api` **tidak** mengimpor `web` (hanya
menyajikan hasil build-nya), dan `shared` tidak mengimpor keduanya.

## Quick Start

```bash
# Prasyarat: Bun + PostgreSQL lokal
# macOS: brew install postgresql@17 && brew services start postgresql@17

cp apps/api/.env.example apps/api/.env   # isi BETTER_AUTH_SECRET (openssl rand -base64 32)
createdb hono_react_starter              # sekali saja

bun install                 # install semua workspace (apps/*, packages/*)
bun run db:migrate          # buat tabel (notes, auth, rate_limit)
bun run db:seed             # opsional: akun admin
bun run dev                 # api → http://localhost:3000, web → http://localhost:5173
```

Buka **http://localhost:5173** (Vite). Semua request `/api/*` diproxy ke backend di port 3000,
jadi cookie sesi Better Auth bekerja seperti same-origin. Hanya ingin salah satu:
`bunx nx dev api` atau `bunx nx dev web`.

Atau seluruh stack via Docker: `docker compose up --build` (app + PostgreSQL, http://localhost:3000).

## Environment Variables

Semua env dibaca **backend** dari `apps/api/.env` (jangan di-commit; Bun memuatnya otomatis
karena script berjalan dengan cwd `apps/api`). Salin `apps/api/.env.example` lalu sesuaikan.
Frontend tidak membutuhkan `.env`; untuk Vite tersedia `PORT` (default 5173) dan `API_URL` /
`API_PORT` (target proxy, default `http://localhost:3000`).

| Variabel | Wajib | Default | Keterangan |
| --- | --- | --- | --- |
| `DATABASE_URL` | Ya (production) | `postgresql://localhost:5432/hono_react_starter` (dev) | URL koneksi PostgreSQL. Fail-fast di production bila kosong |
| `BETTER_AUTH_SECRET` | Ya | — | Rahasia Better Auth, min 32 karakter. Buat: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Ya (production) | `http://localhost:PORT` (dev) | Origin publik aplikasi, mis. `https://app.example.com`. Wajib `https://` di production (trusted origin + cookie Secure) |
| `PORT` | Tidak | `3000` | Port server API (dev & production) |
| `TRUSTED_ORIGINS` | Tidak | dev: `http://localhost:5173`; prod: kosong | Origin lain yang dipercaya Better Auth (CSRF), dipisah koma — mis. Vite dev server. Tidak perlu di production bila API menyajikan frontend (same-origin) |
| `WEB_DIST_DIR` | Tidak | `apps/web/dist` | Folder hasil build frontend yang disajikan API di production |
| `MAIL_PROVIDER` | Tidak | test: `memory`; lainnya: `console` | Pengirim email verifikasi / reset password: `console` (hanya dicatat di log), `memory` (ditangkap untuk test), `resend` (HTTP API Resend) |
| `MAIL_FROM` | Ya (bila `resend`) | — | Alamat pengirim, mis. `App <no-reply@example.com>` |
| `RESEND_API_KEY` | Ya (bila `resend`) | — | Kunci API Resend |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | Tidak | `false` | `true` = sign-in ditolak (`403 EMAIL_NOT_VERIFIED`) sampai email diverifikasi; di production wajib `MAIL_PROVIDER=resend` |
| `TEST_DATABASE_URL` | Tidak | `DATABASE_URL` + akhiran `_test` | Database untuk `bun test` (tidak pernah memakai DB dev) |
| `API_RATE_LIMIT_MAX` | Tidak | `100` (test: nonaktif) | Request per jendela per IP untuk `/api/*`; `0` = nonaktif |
| `API_RATE_LIMIT_WINDOW` | Tidak | `60` | Panjang jendela rate limit API (detik) |
| `TRUST_PROXY` | Tidak | `false` | Percayai header IP proxy (`cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`). **Wajib `true` di balik reverse proxy** yang menimpa header itu; tanpa proxy biarkan `false` agar IP tidak bisa dipalsukan |
| `AUTH_LOCKOUT_MAX_ATTEMPTS` | Tidak | `5` | Password salah berturut-turut sebelum akun dikunci (`423 ACCOUNT_LOCKED`); `0` = nonaktif |
| `AUTH_LOCKOUT_MINUTES` | Tidak | `15` | Lama kunci akun |
| `CSP_ENABLED` | Tidak | `true` | Kirim `Content-Security-Policy` untuk halaman SPA (`script-src 'self'`) dan `/api/docs` (nonce + CDN Scalar) |
| `AUTH_RATE_LIMIT_MAX` | Tidak | `20` (test: nonaktif) | Rate limit Better Auth `/api/auth/*` per IP per endpoint; `0` = nonaktif. Sign-in/sign-up punya aturan bawaan lebih ketat (3 per 10 detik); `/get-session` selalu dikecualikan |
| `AUTH_RATE_LIMIT_WINDOW` | Tidak | `60` | Jendela rate limit Better Auth (detik) |
| `SERVE_WEB_DIST` | Tidak | prod `true`, lainnya `false` | Sajikan `apps/web/dist` dari API di luar production (dipakai E2E & staging lokal) |
| `API_DOCS_ENABLED` | Tidak | prod `false`, lainnya `true` | Aktifkan `GET /api/openapi.json` + `GET /api/docs` |
| `ALLOW_DEMO_SEED` | Tidak | `false` | Izinkan `db:seed:demo` di production (hanya staging; password akun demo publik) |
| `E2E_PORT` / `E2E_DATABASE_URL` | Tidak | `3199` / DB test | Port & database server yang dijalankan Playwright (`apps/e2e`) |
| `CACHE_PROVIDER` | Tidak | `memory` | Cache aplikasi (`apps/api/src/lib/cache.ts`): `memory` (per proses) atau `redis` (dibagi antar instance, client bawaan Bun) |
| `REDIS_URL` | Ya (bila `redis`) | — | mis. `redis://localhost:6379` |
| `AUTH_SESSION_CACHE_SECONDS` | Tidak | `60` (test: `0`) | Cookie cache sesi Better Auth: `getSession` tanpa DB selama N detik; perubahan role/ban/pencabutan sesi terasa paling lama N detik kemudian. `0` = nonaktif |
| `LOG_LEVEL` | Tidak | prod `info`, dev `debug`, test `silent` | `debug` / `info` / `warn` / `error` / `silent` |
| `LOG_FORMAT` | Tidak | prod `json`, lainnya `pretty` | Format baris log |
| `ADMIN_EMAIL` | Ya (production, saat seed) | `admin@example.com` (dev) | Email akun admin saat `db:seed` |
| `ADMIN_PASSWORD` | Ya (production, saat seed) | `admin123456` (dev) | Password admin saat `db:seed`, min 8 karakter |
| `ADMIN_NAME` | Tidak | `Admin` | Nama admin saat `db:seed` |

## Script

Script root memanggil Nx (`nx run-many`) sehingga berjalan untuk semua proyek, dengan cache:
task yang input-nya tidak berubah tidak dijalankan ulang.

| Script (root) | Deskripsi |
| --- | --- |
| `bun run dev` | Jalankan `api` (bun --watch :3000) + `web` (Vite :5173) bersamaan |
| `bun run build` | Build frontend ke `apps/web/dist` (backend tidak perlu build) |
| `bun run start` | Migrasi otomatis + server production `apps/api` (menyajikan `apps/web/dist`) |
| `bun run preview` | Build lalu start production |
| `bun run typecheck` | `tsc` untuk shared, api, web |
| `bun run lint` | Oxlint untuk semua proyek |
| `bun run test` | Semua test (shared + api + web) + coverage, gagal bila < 90 % per file |
| `bun run e2e` / `e2e:ui` | Playwright E2E (`apps/e2e`): build web → server api + seed demo → browser (lihat `docs/QA.md`) |
| `bun run check` | typecheck + lint + test (sama seperti CI) |
| `bun run affected` | Hanya proyek yang terdampak perubahan sejak `main` (`nx affected`) |
| `bun run graph` | Buka graf dependensi proyek di browser |
| `bun run db:generate` / `db:migrate` / `db:push` / `db:studio` / `db:seed` / `db:test:create` | Diteruskan ke `apps/api` |
| `bun run db:seed:demo` | Akun & data demo untuk tester/E2E/staging (idempoten; ditolak di production tanpa `ALLOW_DEMO_SEED`) |

Menjalankan target satu proyek: `bunx nx <target> <proyek>`, mis. `bunx nx test api`,
`bunx nx dev web`, `bunx nx typecheck shared`. Atau langsung di foldernya:
`cd apps/api && bun run test`.

## Database (Drizzle ORM + PostgreSQL)

Koneksi dibaca dari `DATABASE_URL`. **Alur kerja migrasi:**

```bash
# 1. Ubah schema di apps/api/src/db/schema.ts
# 2. Generate file migrasi SQL
bun run db:generate
# 3. Terapkan
bun run db:migrate
```

Schema saat ini:
- `notes` — id (uuid), userId (FK → user, cascade), title, content, done, createdAt, updatedAt
- `rate_limit` — data rate limiting Better Auth (storage database)
- `api_rate_limit` — counter rate limit `/api/*` (hono-rate-limiter, store PostgreSQL)
- `user`, `session`, `account`, `verification` — tabel Better Auth
- `jwks` — kunci penandatangan JWT (kunci privat terenkripsi dengan `BETTER_AUTH_SECRET`)

## Shared Schema (`packages/shared`)

Tipe dan validasi untuk kontrak API ditulis **sekali**, dipakai server (validasi
input) dan client (tipe data / form):

```ts
// packages/shared/src/notes.ts
export const noteCreateSchema = z.object({
  title: z.string().trim().min(1, 'title wajib diisi').max(200),
  content: z.string().optional().default(''),
})
export type NoteCreateInput = z.infer<typeof noteCreateSchema>
```

- **Server**: `noteCreateSchema.safeParse(body)` di `routes/notes.ts` → `fail(c, 400, 'VALIDATION_ERROR', …, fieldErrors)`
- **Client**: `import type { Note, AdminUser } from '@hono-react-starter/shared'` di komponen

Aturan: isi `packages/shared` harus **runtime-agnostic** (tanpa DOM/Node API) agar
aman dipakai di kedua sisi. Keduanya mengimpor paket workspace yang sama:
`@hono-react-starter/shared` (barrel) atau `@hono-react-starter/shared/<modul>`
(sub-path, lewat `exports` di `packages/shared/package.json`). Tidak ada langkah build:
Bun dan Vite membaca sumber TypeScript-nya langsung.

## Data Fetching & Form

### TanStack Query (`apps/web/src/features/*/api/`, `apps/web/src/lib/query-client.ts`)

Query & mutation terpusat dengan validasi shared schema saat menerima data:

```ts
export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const data = await request<unknown>('/api/notes')
      return noteSchema.array().parse(data) // validasi + tipe
    },
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NoteCreateInput) => request<Note>('/api/notes', { ... }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}
```

- Query: `useNotes()` → `{ data, isPending, isError, error }`
- Mutation: `createNote.mutate(...)` → cache di-refresh otomatis via `invalidateQueries`
- Konfigurasi di `apps/web/src/lib/query-client.ts` (staleTime, retry, refetchOnWindowFocus)

### React Hook Form + Zod

Form memakai `zodResolver` sehingga pesan error & validasi satu sumber dengan server:

```tsx
const noteForm = useForm<
  z.input<typeof noteCreateSchema>,
  any,
  z.output<typeof noteCreateSchema>
>({
  resolver: zodResolver(noteCreateSchema),
  defaultValues: { title: '', content: '' },
})

<form onSubmit={noteForm.handleSubmit(onCreateNote)} noValidate>
  <Input {...noteForm.register('title')} />
  {noteForm.formState.errors.title && <p>{noteForm.formState.errors.title.message}</p>}
</form>
```

Pola 3 generik `useForm<input, context, output>` digunakan agar tipe hasil
parse zod (mis. `content` ber-default `''`) terbawa benar ke `onSubmit`.
Form auth (masuk/daftar) memakai `signInSchema` / `signUpSchema` dari `packages/shared/src/auth.ts`.

## Autentikasi (Better Auth)

- Konfigurasi: `apps/api/src/auth.ts` — `createAuth()` (adapter Drizzle, email/password, admin plugin, bearer, jwt,
  two-factor, verifikasi email, reset password, rate limit, `trustedOrigins`)
- Endpoint: semua request `POST`/`GET` ke `/api/auth/*` ditangani Better Auth (dibungkus `withAuthAudit` → audit log)
- Client React: `apps/web/src/lib/auth-client.ts` (`useSession()`, `signIn`, `signUp`, `signOut`, `requestPasswordReset`,
  `resetPassword`, `sendVerificationEmail`, `changePassword`, `twoFactor.*`)

### Alur akun (verifikasi email, reset password, 2FA)

| Alur | Server | Frontend |
| --- | --- | --- |
| **Verifikasi email** | Email dikirim saat sign-up (`sendOnSignUp`) dan saat sign-in ditolak (`sendOnSignIn`). Tautan `GET /api/auth/verify-email?token=…&callbackURL=…` → set `emailVerified`, sesi otomatis, redirect ke `callbackURL` (`?error=…` bila gagal). Berlaku 24 jam | `/verify-email` (sukses / gagal), tombol **Kirim ulang** di form masuk (saat `EMAIL_NOT_VERIFIED`) dan halaman **Keamanan** |
| **Wajib verifikasi** | `AUTH_REQUIRE_EMAIL_VERIFICATION=true` → sign-in sebelum verifikasi `403 EMAIL_NOT_VERIFIED`; sign-up tidak membuat sesi (`token: null`) | Form daftar menampilkan "Periksa email Anda" |
| **Lupa / reset password** | `POST /request-password-reset { email, redirectTo }` (respons selalu 200) → email → `GET /reset-password/:token?callbackURL` → redirect `redirectTo?token=…` → `POST /reset-password { newPassword, token }`. Token sekali pakai, 1 jam, semua sesi lama dicabut | `/forgot-password`, `/reset-password?token=…` |
| **Ganti password** | `POST /change-password { currentPassword, newPassword, revokeOtherSessions }` | Kartu di `/settings/security` |
| **2FA TOTP** | Plugin `twoFactor` (tabel `two_factor`, secret & backup code terenkripsi). `POST /two-factor/enable { password }` → `{ totpURI, backupCodes }` → `POST /two-factor/verify-totp { code }` mengaktifkan. Sign-in akun ber-2FA → `{ twoFactorRedirect: true }` + cookie sementara → `verify-totp` / `verify-backup-code { code, trustDevice }` → sesi. 10 kode salah → akun dikunci 15 menit | Kartu 2FA di `/settings/security` (QR via `qrcode.react`, secret manual, backup code); langkah kedua login di `/login/two-factor` |

Email dikirim lewat `Mailer` (`apps/api/src/lib/mailer.ts`): `ConsoleMailer` (dev — isi email muncul di log,
termasuk tautannya), `MemoryMailer` (test), `ResendMailer` (HTTP API, tanpa SDK). Template (teks + HTML,
bahasa Indonesia) ada di `lib/emails.ts`. Provider lain (SMTP/nodemailer, SES, Postmark): implementasikan
`Mailer.send()` dan daftarkan di `createMailer()`.

Di development tautan email mengarah ke origin API (`BETTER_AUTH_URL`, port 3000) tetapi `callbackURL`
diisi origin frontend (`absoluteUrl()` di `auth-client.ts`), jadi setelah diproses server pengguna
kembali ke Vite (5173). Origin itu harus ada di `TRUSTED_ORIGINS` (default dev sudah).

**Menambah plugin** (mis. OAuth Google, passkey):

```bash
# 1. Tambahkan plugin di apps/api/src/auth.ts
# 2. Regenerate schema auth + migrasi (dari folder apps/api)
cd apps/api
bunx better-auth generate --config src/auth.ts --output src/db/auth-schema.ts -y
bun run db:generate && bun run db:migrate
# 3. Client plugin di apps/web/src/lib/auth-client.ts
```

## JWT (API client non-browser)

Browser memakai sesi cookie (HttpOnly). Untuk klien lain (mobile, service, CLI) ada dua jalur:

| Jalur | Cara | Catatan |
| --- | --- | --- |
| **JWT** (direkomendasikan) | `GET /api/auth/token` (dengan sesi) → `{ token }` → kirim `Authorization: Bearer <jwt>` | Stateless: diverifikasi lewat tanda tangan + `iss`/`aud`/`exp` terhadap JWKS, tanpa query DB sesi. Berlaku 15 menit (`JWT_EXPIRATION`), tidak bisa dicabut sebelum expired |
| **Session token** | `POST /api/auth/sign-in/email` → header `set-auth-token` → `Authorization: Bearer <token>` | Plugin `bearer`: setara cookie, bisa dicabut (sign-out) |

```bash
# 1. Masuk (tanpa browser) → session token di header set-auth-token
curl -si -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -d '{"email":"admin@example.com","password":"admin123456"}' | grep -i set-auth-token

# 2. Tukar menjadi JWT
curl -s http://localhost:3000/api/auth/token -H "Authorization: Bearer <session token>"

# 3. Pakai JWT ke API
curl -s http://localhost:3000/api/notes -H "Authorization: Bearer <jwt>"
```

- Klaim JWT: `sub`, `id`, `email`, `name`, `role` (+ `iss`, `aud`, `exp`, `iat`) — lihat `definePayload` di `apps/api/src/auth.ts` dan `jwtPayloadSchema` di `packages/shared/src/auth.ts`.
- Kunci: EdDSA (Ed25519) di tabel `jwks`; publik di `GET /api/auth/jwks` sehingga **service lain** bisa memverifikasi token tanpa memanggil server ini.
- `GET /api/auth/get-session` juga mengirim JWT di header `set-auth-jwt`.
- Di UI, kartu Autentikasi punya tombol **Buat token** sebagai demo.
- Karena stateless, perubahan role/ban baru berlaku saat token berikutnya diterbitkan (maks. 15 menit). Untuk kebutuhan pencabutan instan, pakai session token.

## RBAC (Role-Based Access Control)

Role disimpan di kolom `user.role` (`admin` / `user`, default `user`). Permission
didefinisikan **sekali** di `packages/shared/src/permissions.ts` (Better Auth access control)
dan dipakai server maupun client:

```ts
// packages/shared/src/permissions.ts
export const statements = { ...defaultStatements, note: ['create', 'read', 'update', 'delete'] } as const
export const roles = {
  user: ac.newRole({ note: ['create', 'read', 'update', 'delete'] }),
  admin: ac.newRole({ ...adminAc.statements, note: ['create', 'read', 'update', 'delete'] }),
}
can('user', { user: ['list'] }) // false
```

**Melindungi route di Hono** (`apps/api/src/middleware/auth.ts`) — semua menerima sesi cookie atau JWT:

```ts
app.get('/api/profil', requireAuth, (c) => c.json(c.get('user')))          // cukup login
app.get('/api/laporan', requireRole('admin'), handler)                      // berdasar role
adminRoutes.get('/users', requirePermission({ user: ['list'] }), handler)  // berdasar permission
```

`c.get('user')` bertipe `AuthUser` = `{ id, email, name, role, authMethod: 'session' | 'jwt' }`.
Perilaku: tanpa identitas → `401 UNAUTHORIZED`, identitas ada tapi tidak berhak → `403 FORBIDDEN`.

**Menambah role / resource:** tambah entri di `statements` dan `roles`, tambah nama role
di `USER_ROLES`, lalu pakai `requirePermission` di route dan `can()` di UI.

**Membuat akun admin:**

```bash
bun run db:seed
# default dev: admin@example.com / admin123456 — di production ADMIN_EMAIL/ADMIN_PASSWORD wajib
```

**Di frontend:** `useSession().data.user.role`, dan `can(role, { user: ['list'] })` untuk
menampilkan/menyembunyikan UI (contoh panel admin di `App.tsx`). Client admin tersedia via
`authClient.admin.*` (`listUsers`, `setRole`, `banUser`, `checkRolePermission`).

## API

### Format respons standar

Semua endpoint `/api/*` (kecuali `/api/auth/*` milik Better Auth) memakai satu envelope,
didefinisikan di `packages/shared/src/api.ts` dan dipakai server + client:

```jsonc
// Sukses (200/201)
{ "success": true, "data": { "id": "…", "title": "Belajar" }, "message": "Catatan dibuat" }

// Gagal (4xx/5xx)
{ "success": false, "code": "VALIDATION_ERROR", "message": "Data tidak valid",
  "details": { "title": ["title wajib diisi"] } }
```

- `data` — payload (objek atau array). `message` — opsional, untuk ditampilkan ke pengguna.
- `code` — kode mesin stabil (`API_ERROR_CODES`): `VALIDATION_ERROR`, `INVALID_JSON`, `UNAUTHORIZED`,
  `FORBIDDEN`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `HTTP_ERROR`, `INTERNAL_ERROR`,
  `SERVICE_UNAVAILABLE`. `details` — opsional (error field, `requestId` untuk 500, dsb).
- HTTP status tetap bermakna; client tidak perlu memeriksa `success` secara manual.

**Server** — helper di `apps/api/src/lib/response.ts`:

```ts
return ok(c, note, { status: 201, message: 'Catatan dibuat' })
return fail(c, 404, 'NOT_FOUND', 'Note tidak ditemukan')
return fail(c, 400, 'VALIDATION_ERROR', 'Data tidak valid', parsed.error.flatten().fieldErrors)
```

**Client** — `request<T>(url)` mengembalikan `data`; `requestEnvelope<T>(url)` mengembalikan
`{ success, data, message }` (dipakai `useCreateNote` untuk menampilkan pesan). Error dilempar
sebagai `ApiError { status, code, message, details }`.

**Log error** — lihat bagian [Logging & Tracing](#logging--tracing): 500 dicatat lengkap (stack,
cause, kode Postgres) dengan `requestId` yang sama dengan `details.requestId` di respons.

| Method | Path | Deskripsi |
| --- | --- | --- |
| GET | `/api/health/live` | Liveness: `data: { status: 'ok', uptime, timestamp }` — tanpa cek DB (untuk restart probe) |
| GET | `/api/health/ready` | Readiness (alias `/api/health`): `data: { status, database, uptime, timestamp }`; `503 SERVICE_UNAVAILABLE` bila DB down |
| GET | `/api/hello?name=...` | `data: { greeting, from, time }` + `message` |
| POST | `/api/echo` | Contoh body JSON (`400` bila bukan JSON) |
| GET | `/api/notes` | Daftar notes milik user login (`401` tanpa sesi) |
| POST | `/api/notes` | Buat note (validasi zod) |
| PATCH | `/api/notes/:id` | Update note milik sendiri (`404` bila bukan pemilik) |
| DELETE | `/api/notes/:id` | Hapus note milik sendiri → `data: { id }`, `message` |
| GET | `/api/admin/users` | Daftar user (permission `user:list` → admin) |
| GET | `/api/admin/me` | Identitas pemanggil + `authMethod` (`session`/`jwt`) |
| GET | `/api/admin/audit-logs` | Audit log terbaru dulu (permission `audit:list`). Query: `limit` (≤200), `cursor` (dari `nextCursor`), `action` (prefix, mis. `auth.`), `actorId`, `success` → `data: { items, nextCursor }` |
| GET | `/api/auth/token` | Terbitkan JWT untuk sesi saat ini |
| GET | `/api/auth/jwks` | Kunci publik (JWKS) untuk verifikasi JWT |
| POST | `/api/auth/sign-up/email` | Daftar akun |
| POST | `/api/auth/sign-in/email` | Masuk |
| GET | `/api/auth/get-session` | Ambil sesi |
| POST | `/api/auth/sign-out` | Keluar |
| POST | `/api/auth/send-verification-email` | Kirim ulang tautan verifikasi `{ email, callbackURL }` |
| GET | `/api/auth/verify-email` | Tautan dari email (`?token&callbackURL`) → redirect |
| POST | `/api/auth/request-password-reset` | `{ email, redirectTo }` → email reset (selalu 200) |
| POST | `/api/auth/reset-password` | `{ newPassword, token }` |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword, revokeOtherSessions }` (butuh sesi) |
| POST | `/api/auth/two-factor/enable` · `verify-totp` · `verify-backup-code` · `disable` · `generate-backup-codes` | 2FA (lihat "Alur akun") |

### Dokumentasi OpenAPI

`apps/api/src/openapi.ts` membangun dokumen OpenAPI 3.0 dari schema Zod `packages/shared`
(`z.toJSONSchema`), jadi tipe di dokumentasi sama dengan validasi runtime. Endpoint Better Auth
yang dipakai aplikasi didokumentasikan ringkas di bagian `auth`.

- `GET /api/openapi.json` — spesifikasi (impor ke Postman/Insomnia/Bruno).
- `GET /api/docs` — UI interaktif [Scalar](https://scalar.com) (dimuat dari CDN, tanpa dependency server).

Aktif otomatis di luar production; di production/staging set `API_DOCS_ENABLED=true`. Endpoint
baru: tambahkan entri di `paths` pada `buildOpenApiDocument()` (test `tests/openapi.test.ts`
memastikan setiap operasi punya tag & responses).

### Audit log

Setiap aksi penting ditulis ke tabel `audit_log` (`apps/api/src/lib/audit.ts`), **append-only**, tanpa FK ke
`user` agar riwayat tetap utuh setelah akun dihapus. Kolom: `at`, `actorId`/`actorEmail` (null = anonim),
`action` (`AUDIT_ACTIONS` di `packages/shared/src/audit.ts`), `success`, `targetType`/`targetId`,
`requestId` (sama dengan header `X-Request-Id` dan baris log), `ip`, `userAgent`, `metadata` (JSON).

- **Auth** (`apps/api/src/auth-audit.ts`): pembungkus `auth.handler` — bukan hook Better Auth — sehingga
  kegagalan (password salah, kode TOTP salah, token kedaluwarsa) ikut tercatat (`success: false`,
  `metadata.status`), dan pelaku diambil dari sesi sebelum aksi (sign-out, ganti password, aksi admin).
  Aksi admin plugin (`set-role`, `ban-user`, `remove-user`, …) mencatat `targetId` = user yang diubah.
- **Data**: `auditFromContext(c, { action: 'note.created', targetType: 'note', targetId })` di route.
  Tambahkan aksi baru di `AUDIT_ACTIONS` lalu panggil helper ini.
- Konteks request (`requestId`, IP, UA) tersedia lewat `AsyncLocalStorage` (`lib/request-context.ts`) untuk
  kode yang tidak menerima Context Hono (callback Better Auth, dsb).
- Kegagalan menulis audit **tidak** menggagalkan request (fail-open) tetapi dicatat di log level `error`.
  Ubah `recordAudit` menjadi `throw` bila kebijakan compliance mewajibkan fail-closed.

## Alur Menambah Fitur

Pola yang dipakai di template ini (agar tetap mudah di-maintain):

1. **Schema** → tulis tipe & validasi di `packages/shared/src/<fitur>.ts` (Zod), ekspor dari `index.ts`
2. **Database** → tambah tabel di `apps/api/src/db/schema.ts`, lalu `db:generate` + `db:migrate`
3. **API** → buat router di `apps/api/src/routes/<fitur>.ts`, validasi dengan schema shared, mount di `apps/api/src/app.ts` (pasang `requireAuth` / `requirePermission` bila perlu)
4. **Hooks** → buat query/mutation di `apps/web/src/features/<fitur>/api/<fitur>.ts` (TanStack Query + zod parse)
5. **UI** → `apps/web/src/features/<fitur>/` (api + components) dan `pages/<fitur>-page.tsx`; daftarkan di `config/paths.ts`, `app/routes.tsx`, `config/navigation.ts`
6. **Test** → `apps/api/tests/<fitur>.test.ts` dan/atau `apps/web/tests/`; `bun run affected` menjalankan hanya proyek yang terdampak

## Struktur Frontend (`apps/web/src`)

Struktur **berbasis fitur** untuk proyek menengah: kode dikelompokkan per domain, bukan per jenis
file, sehingga fitur bisa ditambah/dihapus tanpa menyentuh folder lain.

| Folder | Isi | Aturan |
| --- | --- | --- |
| `app/` | `providers.tsx` (ErrorBoundary → Theme → QueryClient → Tooltip + Toaster), `routes.tsx` (definisi route + guard), `router.tsx` (createBrowserRouter) | Satu-satunya tempat yang tahu seluruh app |
| `pages/` | Satu komponen per route: `home-page`, `login-page`, `two-factor-page`, `forgot-password-page`, `reset-password-page`, `verify-email-page`, `notes-page`, `settings/{api-token,security}-page`, `admin/{users,audit-logs}-page`, `not-found-page`, `forbidden-page`, `route-error-page` | Tipis: set judul (`useDocumentTitle`), susun komponen fitur. Tanpa fetch langsung |
| `features/<fitur>/` | `api/` (hooks TanStack Query + schema shared), `components/`, `hooks/`, `index.ts` (barrel) | Fitur boleh mengimpor `components/`, `hooks/`, `lib/`, `config/`; **hindari** impor antar fitur (lewat `index.ts` bila terpaksa) |
| `components/ui/` | Primitif shadcn/ui (di-generate CLI, jangan diedit manual kecuali perlu) | Dikecualikan dari coverage |
| `components/layout/` | `app-shell`, `site-header`, `main-nav`, `mobile-nav` (Sheet), `site-footer` | Kerangka halaman |
| `components/common/` | `page-header`, `empty-state`, `loading-state`, `error-message`, `theme-toggle`, `error-boundary` | Komponen generik lintas fitur |
| `hooks/` | `use-theme`, `use-document-title`, `use-visible-nav` | Hook generik (bukan milik satu fitur) |
| `lib/` | `api/request.ts` (fetch + `ApiError`), `auth-client.ts`, `query-client.ts`, `theme.ts`, `format.ts`, `utils.ts` (`cn`) | Tanpa JSX/React state |
| `config/` | `site.ts` (nama, stack, repo), `paths.ts` (semua path route), `navigation.ts` (item nav + syarat login/permission) | Konstanta; jangan hardcode path/nama di komponen |
| `styles/` | `globals.css` | Tailwind v4 + token tema shadcn |

Fitur bawaan: **auth** (`useAuth`, `useSignOut`, `AuthForm`, `TwoFactorForm`, `ForgotPasswordForm`,
`ResetPasswordForm`, `TwoFactorCard`, `ChangePasswordCard`, `EmailVerificationCard`, `UserMenu`, guard
`RequireAuth` / `RequirePermission`, `ApiTokenCard`), **notes** (hooks CRUD + `NoteForm` + `NoteList`),
**admin** (`UsersTable`, `AuditLogsTable` + `useAuditLogs` infinite query), **system** (`HealthCard`, `HelloCard`).

**Routing** (React Router, `app/routes.tsx`): publik `/`, `/login`, `/login/two-factor`, `/forgot-password`,
`/reset-password`, `/verify-email`; di bawah `RequireAuth` (redirect ke `/login` dengan `state.from`, kembali
setelah masuk): `/notes`, `/settings/api-token`, `/settings/security`; di bawah `RequirePermission`:
`/admin/users` (`user:list`) dan `/admin/audit-logs` (`audit:list`) — 403 bila tak berhak.
Route lain → 404; error render → `RouteErrorPage`.

**Tema**: `ThemeProvider` (light / dark / system, tersimpan di `localStorage`, mengikuti perubahan OS)
+ `ThemeToggle` di header. **Toast**: `toast()` dari `sonner` (Toaster di `Providers`).

**Menambah fitur baru** (mis. `projects`):

```
features/projects/
├── api/projects.ts          # useProjects(), useCreateProject() — schema dari @hono-react-starter/shared
├── components/project-list.tsx
└── index.ts
pages/projects-page.tsx      # <PageHeader> + <ProjectList>
```

lalu daftarkan path di `config/paths.ts`, route di `app/routes.tsx` (di bawah guard yang sesuai),
dan item nav di `config/navigation.ts`.

## shadcn/ui

Konfigurasi di `apps/web/components.json` (style `base-nova` di atas Base UI, ikon Lucide, alias `@/`).
Komponen terpasang: `alert`, `alert-dialog`, `avatar`, `badge`, `button`, `card`, `checkbox`,
`dialog`, `dropdown-menu`, `field`, `input`, `label`, `select`, `separator`, `sheet`, `skeleton`,
`sonner`, `switch`, `table`, `tabs`, `textarea`, `tooltip`.

```bash
cd apps/web && bunx shadcn@latest add form combobox data-table
```

Catatan untuk monorepo: CLI shadcn mendeteksi root repo dan bisa menulis ke
`apps/web/apps/web/src/...` — bila itu terjadi, pindahkan file ke `apps/web/src/components/ui/`.
Komponen generated memakai `cn` dari `@/lib/utils` (clsx + tailwind-merge); `sonner.tsx` sudah
diadaptasi memakai `useTheme` internal (tanpa `next-themes`). Pola form: `Field` + `FieldLabel` +
`FieldError errors={[errors.x]}` dengan React Hook Form (lihat `features/auth/components/auth-form.tsx`).

## Testing

Test memakai `bun test` bawaan (tanpa Vitest/Jest), dijalankan per proyek lewat Nx.

```bash
bun run db:test:create   # sekali: database test lokal
bun run test             # shared + api + web (nx run-many -t test)
bunx nx test api         # hanya backend
```

- **`apps/api/tests/`** — test integrasi: memanggil `app.fetch` langsung (tanpa port) terhadap
  database test. Preload `tests/setup.ts` mengarahkan `DATABASE_URL` ke DB test
  (`TEST_DATABASE_URL` atau nama DB + `_test`), menjalankan migrasi, lalu mengosongkan tabel.
  Rate limit Better Auth otomatis nonaktif saat `NODE_ENV=test`, dan `MAIL_PROVIDER=memory` sehingga
  test alur akun (`tests/account.test.ts`) membaca tautan verifikasi/reset dari `MemoryMailer`;
  kode TOTP dibuat dengan `createOTP` dari `@better-auth/utils` memakai secret dari `totpURI`.
  `createAuth({ requireEmailVerification: true, mailer })` dipakai untuk menguji mode wajib verifikasi.
- **`apps/web/tests/`** — test komponen React dengan happy-dom + Testing Library, disusun mengikuti
  `src`: `app/` (router, guard, layout, tema, menu pengguna), `features/` (auth, notes, admin, system),
  `components/`, `lib/`. `tests/utils.tsx` menyediakan `renderAt(path)` (seluruh app dengan
  `createMemoryRouter`) + `setupEach`/`teardownEach`; `tests/mocks/` berisi mock `@/lib/auth-client`
  (`asGuest()`, `asUser()`, `asAdmin()`) dan mock `fetch` API in-memory (`apiMock.fail.*`).
- **`packages/shared/tests/`** — test schema Zod dan `can()` RBAC.
- **`apps/e2e/`** — Playwright di Chromium terhadap `apps/api` yang menyajikan build `apps/web`
  (`SERVE_WEB_DIST=true`, port 3199, DB test, migrasi + `db:seed:demo` otomatis lewat `webServer`).
  `bun run e2e` (Nx membangun web dulu) atau `bun run e2e:ui`. Sekali: `bunx playwright install chromium`.
  Test memakai akun demo dari `packages/shared/src/demo.ts` dan selector `data-testid`
  (daftar di `docs/QA.md`). Rate limit dimatikan di E2E; berjalan berurutan (`workers: 1`).

Panduan lengkap untuk tester manual (akun demo, skenario, cara membaca email di log, pelaporan
bug): **[`docs/QA.md`](docs/QA.md)**.

**Coverage** selalu aktif (`bunfig.toml` di tiap proyek) dengan ambang **90 % baris & fungsi**.
Bun menerapkan ambang ini **per file** untuk setiap file yang dimuat, jadi file baru harus ikut
diuji atau `bun test` gagal (CI ikut merah). Dikecualikan dari perhitungan: `tests/**`, deklarasi
schema Drizzle (`apps/api/src/db/schema.ts`, `auth-schema.ts` hasil generate CLI), primitif shadcn
(`apps/web/src/components/ui/**`), `main.tsx` dan `app/router.tsx` (hanya dimuat browser), dan `packages/shared` saat dimuat oleh api/web (sudah diuji
sendiri). Kode yang hanya berjalan saat proses start (`apps/api/src/index.ts`, `migrate.ts`,
`seed.ts`, `apps/web/src/main.tsx`) tidak dimuat test dan diverifikasi lewat smoke test CI.

Pola yang dipakai agar jalur production bisa diuji tanpa mengubah `NODE_ENV`:
`createApp({ isProd, distDir, extend })` di `apps/api/src/app.ts` dan `createApiRoutes({ ping })`
di `routes/api.ts` (simulasi DB down → 503).

## Logging & Tracing

Logger terstruktur tanpa dependency di `apps/api/src/lib/logger.ts` (format JSON di production,
`pretty` di development; atur via `LOG_LEVEL` / `LOG_FORMAT`).

**Setiap request** menghasilkan satu baris setelah respons selesai (`middleware/request-log.ts`):

```json
{"time":"2026-10-28T05:49:15.832Z","level":"info","msg":"request","service":"hono-react-starter",
 "requestId":"4f2c…","method":"GET","path":"/api/hello","status":200,"durationMs":1.3,
 "ip":"203.0.113.9","userId":"u_01","userAgent":"curl/8.4"}
```

Level otomatis: 2xx/3xx → `info`, 4xx → `warn`, 5xx → `error`. `warn`/`error` ditulis ke stderr,
sisanya ke stdout.

**Error 500** dicatat sebelum baris request, dengan `requestId` yang sama:

```json
{"level":"error","msg":"unhandled error","requestId":"4f2c…","method":"POST","path":"/api/notes",
 "userId":"u_01","err":{"name":"PostgresError","message":"duplicate key value…","code":"23505",
 "detail":"Key (email)=(a@b) already exists.","constraint":"user_email_unique","stack":"…"}}
```

Client menerima `{ success:false, code:"INTERNAL_ERROR", details:{ requestId:"4f2c…" } }` dan UI
menampilkan `… (ref: 4f2c…)` (`describeError()` di `apps/web/src/lib/api/request.ts`). Alur trace:
**pengguna melaporkan ref → cari `requestId` di log → baris `unhandled error` (stack, kode DB) + baris
`request` (user, IP, durasi)**. Header `X-Request-Id` juga ada di setiap respons; reverse proxy
bisa meneruskannya ke log akses.

**Di handler** pakai logger per-request yang sudah membawa `requestId`:

```ts
c.get('log').info('note created', { noteId: note.id })
c.get('log').warn('stok menipis', { productId, sisa })
c.get('log').error('gagal kirim email', { err })   // err diserialisasi otomatis
```

Error di luar siklus request (`unhandledRejection`, `uncaughtException`) dan start/stop server
juga dicatat (`apps/api/src/index.ts`). `createApp({ logger })` menerima logger kustom (test memakai
`createCapturingSink()` untuk memeriksa baris log).

## Caching

Prinsip: **data per pengguna tidak pernah disimpan proxy/CDN**, transfer dan query DB dihemat
di tempat yang aman.

| Lapisan | Mekanisme | Di mana |
| --- | --- | --- |
| Aset frontend | Nama file ber-hash → `Cache-Control: public, max-age=31536000, immutable`; `index.html` → `no-cache` | `apps/api/src/app.ts` |
| Respons API | Default `no-store`. GET daftar (`/api/notes`, `/api/admin/users`, `/api/admin/audit-logs`) memakai `revalidate()`: `ETag` + `private, no-cache` → browser mengirim `If-None-Match`, server menjawab **304** tanpa body bila sama | `apps/api/src/middleware/cache-control.ts` |
| Sesi | Cookie cache Better Auth (`better-auth.session_data`, bertanda tangan) selama `AUTH_SESSION_CACHE_SECONDS` → `getSession`/`requireAuth` tanpa query DB. Dihapus saat sign-out/ganti password | `apps/api/src/auth.ts` |
| JWT | Hasil verifikasi disimpan di `Cache` dengan key SHA-256 token sampai `exp` (JWT stateless, jadi aman) | `apps/api/src/middleware/auth.ts` (`verifyJwtCached`) |
| Cache aplikasi | `Cache` interface (`get/set/delete` + TTL) dengan `MemoryCache` (FIFO, batas entri) dan `RedisCache` (`Bun.RedisClient`, fail-open). Helper `cached(cache, key, ttl, fn)` untuk pola cache-aside | `apps/api/src/lib/cache.ts`, singleton `src/cache.ts` |
| State klien | TanStack Query `staleTime` 30 detik, `retry` 1, tanpa refetch saat fokus; mutasi catatan **optimistic** (`onMutate` → ubah cache, `onError` → rollback + toast, `onSettled` → invalidate) | `apps/web/src/lib/query-client.ts`, `features/notes/api/notes.ts` |

Memakai cache untuk data lain:

```ts
import { cache } from '../cache.ts'
import { cached } from '../lib/cache.ts'

const stats = await cached(cache, 'stats:global', 30, () => db.select()…)   // 30 detik
await cache.delete('stats:global')                                           // invalidasi manual
```

Hanya cache data yang **tidak per pengguna** atau beri key per pengguna (`notes:${userId}`) dan
hapus saat mutasi. Untuk beberapa instance di production set `CACHE_PROVIDER=redis` agar cache
dibagi; `memory` tetap benar, hanya tiap instance menghitung sendiri.

Yang sengaja **tidak** dipakai: persistensi cache Query ke `localStorage`/IndexedDB (data sensitif
tertinggal di perangkat bersama, `staleTime` pendek membuat data pulihan segera di-refetch, dan
butuh invalidasi per rilis) dan service worker/offline. Keduanya bisa ditambah bila kebutuhannya
muncul (katalog publik, mobile dengan jaringan buruk).

## Security & Hardening

Yang sudah terpasang di `apps/api/src/app.ts` / `auth.ts`:

| Area | Implementasi |
| --- | --- |
| Env | Fail-fast: `BETTER_AUTH_SECRET` ≥ 32 char, `DATABASE_URL` & `BETTER_AUTH_URL` (https) wajib di production |
| Header | `secureHeaders()` — nosniff, `X-Frame-Options: DENY`, Referrer-Policy, HSTS (production); **CSP** untuk SPA (`default-src 'self'`, tanpa inline script, `frame-ancestors 'none'`) dan `/api/docs` (nonce per request + CDN Scalar) — `buildCsp()` di `openapi.ts`, `CSP_ENABLED` |
| IP klien | Header proxy hanya dipercaya bila `TRUST_PROXY=true` (di balik Caddy/Nginx/Cloudflare); selain itu alamat koneksi. Better Auth membaca satu header internal `x-client-ip` yang selalu ditulis ulang server (`withClientIp`), jadi klien tidak bisa memalsukan IP untuk rate limit, sesi, maupun audit |
| Body | `bodyLimit` 1 MB untuk `/api/*` → `413` |
| Cache | `/api/*` → `no-store`; `/assets/*` immutable 1 tahun; `index.html` no-cache |
| Auth | Cookie sesi HttpOnly (Secure saat https), CSRF via `trustedOrigins`, rate limit Better Auth per IP per endpoint (`AUTH_RATE_LIMIT_*`; sign-in/sign-up 3 req/10 detik bawaan), **lockout per akun** (`auth-guards.ts`: 5 password salah → `423 ACCOUNT_LOCKED` 15 menit, tabel `sign_in_lockout`, direset saat berhasil masuk), **anti-enumerasi**: daftar dengan email yang sudah ada dibalas seperti daftar yang menunggu verifikasi (audit tetap mencatat 422 aslinya), reset password selalu 200 |
| Rate limit API | `hono-rate-limiter` di `/api/*` (kecuali `/api/auth/*` & `/api/health`): default 100 req/menit/IP, store PostgreSQL (`api_rate_limit`, dibagi antar replika), header `RateLimit-*` + `Retry-After`, `429 RATE_LIMITED` |
| JWT | EdDSA via JWKS, `iss`/`aud` = `BETTER_AUTH_URL`, exp 15 menit, kunci privat terenkripsi di DB; token dimanipulasi → 401 |
| Akun | Verifikasi email (opsional wajib), reset password (token 1 jam sekali pakai, sesi lama dicabut), 2FA TOTP + backup code terenkripsi, lockout 15 menit setelah 10 kode salah, rate limit `/two-factor/*` 3 req/10 detik |
| Audit | `audit_log` append-only untuk auth (termasuk gagal), aksi admin, dan CRUD data — dengan `requestId`, IP, UA |
| RBAC | Permission dicek di server per route (`requirePermission`); role dari sesi atau klaim JWT yang sudah diverifikasi |
| Dependensi | `bun scripts/audit.ts` di CI gagal bila ada advisory high/critical yang mengenai versi terpasang; `overrides` di `package.json` untuk paket transitif; Dependabot mingguan (bun, GitHub Actions, Docker); workflow dengan `permissions: contents: read` |

Keputusan yang masih di tangan Anda (lihat review di `DEVELOPMENT_PROGRESS.md` Iterasi 14): wajibkan verifikasi
email di production (`AUTH_REQUIRE_EMAIL_VERIFICATION=true`), nilai `AUTH_SESSION_CACHE_SECONDS` (jeda pencabutan
sesi), matikan impersonasi admin bila tidak dibutuhkan, dan hapus endpoint demo `/api/hello` & `/api/echo`.
| Data | Notes dibatasi ke pemilik di level query; respons admin berupa DTO (tanpa hash password) |
| Error | `onError` → envelope `INTERNAL_ERROR` + `details.requestId`; log terstruktur berisi stack/cause/kode DB dengan `requestId` yang sama; stack tidak pernah dikirim ke client |

Catatan rate limit: kunci per IP diambil dari header proxy. Pastikan reverse proxy **menimpa**
`X-Forwarded-For`/`X-Real-IP` dengan alamat koneksi asli (bukan meneruskan nilai dari klien),
atau pakai `CF-Connecting-IP` di Cloudflare. Atur via `API_RATE_LIMIT_MAX` / `API_RATE_LIMIT_WINDOW`;
`0` menonaktifkan. Untuk batas per-route berbeda, buat limiter lain dengan
`createApiRateLimiter({ max, windowSeconds, store: new DrizzleRateLimitStore({ prefix: 'upload:' }) })`
dan pasang di route tersebut.

Belum terpasang (tambahkan sesuai kebutuhan): Content-Security-Policy (dinonaktifkan agar HMR Vite
tidak terblokir), CORS (tidak perlu karena satu origin), SSO/OIDC (plugin Better Auth `genericOAuth`/`sso`).

## Deployment

App memakai Web Standard (fetch) sehingga bisa dideploy di banyak platform.

**Docker (direkomendasikan):**

```bash
docker build -t hono-react-starter .      # build apps/web, runtime = apps/api + apps/web/dist
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
  -e BETTER_AUTH_URL=https://app.example.com \
  hono-react-starter
```

Image menjalankan migrasi otomatis lalu serve, dengan `HEALTHCHECK` ke `/api/health/ready`. Di Kubernetes
pakai `/api/health/live` untuk liveness probe (tidak menyentuh DB) dan `/api/health/ready` untuk readiness.
Untuk lokal: `docker compose up --build`.

**Checklist go-live:**

1. `BETTER_AUTH_URL` = origin https publik; reverse proxy meneruskan `X-Forwarded-For` (atau `CF-Connecting-IP`).
2. `BETTER_AUTH_SECRET` unik per environment, `DATABASE_URL` dengan user berhak DDL (untuk migrasi otomatis) — atau jalankan `bun run db:migrate` terpisah dan ubah `start`.
3. Seed admin: `ADMIN_EMAIL=... ADMIN_PASSWORD=... NODE_ENV=production bun run db:seed`.
4. Email: `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `MAIL_FROM` (domain terverifikasi di Resend); lalu
   pertimbangkan `AUTH_REQUIRE_EMAIL_VERIFICATION=true`.
5. Pantau `/api/health/ready` (mengembalikan `503` saat DB down), `/api/health/live`, log `X-Request-Id`,
   dan tabel `audit_log` (mis. lonjakan `auth.sign_in` dengan `success=false`).
6. Backup PostgreSQL terjadwal (termasuk `audit_log`; pertimbangkan retensi/arsip sesuai kebijakan).

**Staging untuk tester (HTTPS, akun demo):**

```bash
cp deploy/staging/.env.staging.example .env.staging     # STAGING_DOMAIN + BETTER_AUTH_SECRET
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --build
docker compose --env-file .env.staging -f docker-compose.staging.yml run --rm seed   # reset akun demo
```

Caddy mengurus sertifikat untuk `STAGING_DOMAIN` dan meneruskan `X-Forwarded-For`; app berjalan
dengan `NODE_ENV=production` plus `API_DOCS_ENABLED=true` dan `ALLOW_DEMO_SEED=true`. Jangan
pakai compose ini untuk production (akun demo berpassword publik).

**Tanpa Docker (VPS/Railway/Fly):**

```bash
export DATABASE_URL=postgresql://user:pass@host/db
export BETTER_AUTH_SECRET=$(openssl rand -base64 32)
export BETTER_AUTH_URL=https://app.example.com
export PORT=3000

bun install --frozen-lockfile
bun run build                 # apps/web/dist
bun run start                 # nx run api:start → migrasi otomatis, lalu serve production
# atau tanpa Nx: cd apps/api && bun run start
```

**Frontend di-host terpisah (CDN / static hosting):** deploy `apps/web/dist` ke hosting statis,
jalankan `apps/api` di server, lalu set `TRUSTED_ORIGINS=https://web.example.com` di API dan
tambahkan middleware `cors` Hono (`hono/cors`) dengan `credentials: true` di `app.ts` — atau
lebih sederhana, letakkan keduanya di balik satu reverse proxy (same-origin).

**Vercel / Cloudflare Workers:** tambahkan adapter `@hono/vercel` /
`@hono/cloudflare-workers` di `apps/api`, build client dengan `bun run build`, dan sesuaikan
entry server sesuai platform.

## Skill untuk agen AI (Claude Code, Codex, Antigravity)

Repo ini siap dipakai tiga agen sekaligus dengan satu sumber kebenaran:

| File / folder | Dibaca oleh | Isi |
| --- | --- | --- |
| `AGENTS.md` | Codex, Antigravity, dan agen lain yang mengikuti konvensi AGENTS.md | Ringkasan stack, perintah, aturan keras, pola |
| `CLAUDE.md` | Claude Code | Hanya `@AGENTS.md` (impor), jadi tidak ada dua versi aturan |
| `.claude/skills/<nama>/SKILL.md` | Claude Code | Skill per alur kerja (format [Agent Skills](https://agentskills.io)) |
| `.agents/skills` → symlink ke `.claude/skills` | Codex CLI/IDE, Antigravity (default `.agents/skills`) | Skill yang sama tanpa duplikasi |

Skill berisi aturan yang **tidak terlihat dari kode** — urutan langkah, perangkap, dan konvensi test —
sehingga agen tidak perlu menemukannya lewat trial-and-error. Codex: `/skills` atau `$nama`; Antigravity
memilih skill dari deskripsinya; Claude Code: `/nama` atau otomatis.

| Skill | Dipakai saat |
| --- | --- |
| `adding-feature` | Menambah resource/halaman baru (shared → api → web → test → dokumen) |
| `db-migrations` | Mengubah schema Drizzle atau menambah tabel plugin Better Auth |
| `writing-tests` | Menulis/memperbaiki test; `bun test` lolos tapi exit 1 (coverage per file); error mock di test web |
| `auditing-actions` | Route baru yang mengubah data atau endpoint auth baru harus masuk `audit_log` |
| `adding-shadcn-component` | `bunx shadcn add` menulis ke folder salah / import `cn` rusak |
| `verifying-changes` | Sebelum menyatakan selesai, commit, smoke test di port bebas, memantau CI |

Menambah skill: buat `.claude/skills/<nama>/SKILL.md` dengan frontmatter `name` (sama dengan nama folder) +
`description` ("Use when …"), uji dengan subagent tanpa dan dengan skill, lalu commit — otomatis ikut
terlihat di `.agents/skills`. Di Windows, aktifkan symlink git (`git config core.symlinks true`) atau salin
foldernya.

## Troubleshooting

| Masalah | Solusi |
| --- | --- |
| PostgreSQL gagal start di macOS (`postmaster became multithreaded`) | Set locale valid: `LC_ALL=en_US.UTF-8` saat start (`pg_ctl` / service) |
| Port 3000 / 5173 sudah terpakai | API: set `PORT` di `apps/api/.env` dan `API_PORT` untuk Vite. Web: `PORT=5174 bunx nx dev web` lalu tambahkan origin itu ke `TRUSTED_ORIGINS` |
| Sign-in dari Vite → `403 INVALID_ORIGIN` | Origin Vite tidak dipercaya Better Auth — pastikan `TRUSTED_ORIGINS` memuat `http://localhost:<port Vite>` (default 5173 sudah otomatis di dev) |
| Alias `@/` tidak ditemukan saat `bun test` | Alias didefinisikan di `tsconfig.base.json` (Bun hanya membaca `paths` dari config dasar saat `extends`) — jangan pindahkan ke tsconfig proyek |
| Nx memakai hasil cache lama | `bunx nx reset` lalu jalankan ulang, atau tambahkan `--skip-nx-cache` |
| `EADDRINUSE` saat start | Bun v1.2 auto-serve dari default export — jangan panggil `Bun.serve` manual di entry |
| Migrasi gagal `multiple primary keys` | Migrasi lama yang merubah PK perlu diedit manual (keterbatasan drizzle-kit) |
| `BETTER_AUTH_SECRET` error saat start | Pastikan env terisi ≥32 karakter (lihat `apps/api/.env.example`) |
| `BETTER_AUTH_URL harus https://` saat start production | Set origin publik https; untuk uji lokal pakai `NODE_ENV` selain production |
| `bun test` gagal menyiapkan database | Jalankan `bun run db:test:create` atau set `TEST_DATABASE_URL` |
| Migrasi `0005` gagal (`user_id` NOT NULL) | Tabel `notes` berisi data tanpa pemilik — lihat komentar di `apps/api/drizzle/0005_notes_user_id.sql` |

## Roadmap

- [x] Proteksi route notes per-user (pemilik catatan)
- [x] Test otomatis (bun test + Testing Library)
- [x] Dockerfile + CI (GitHub Actions)
- [x] Monorepo Nx: `apps/api`, `apps/web`, `packages/shared`
- [x] React Router + struktur frontend berbasis fitur + set shadcn/ui lengkap + tema gelap
- [x] Verifikasi email, reset/ganti password, 2FA TOTP (plugin Better Auth + Mailer)
- [x] Audit log + health check live/ready
- [ ] OAuth Google/GitHub / SSO OIDC (plugin Better Auth)
- [ ] OpenTelemetry (tracing/metrics) + Sentry
- [ ] OpenAPI dari schema Zod shared
- [ ] Playwright E2E di CI
- [ ] Content-Security-Policy (nonce) di production
