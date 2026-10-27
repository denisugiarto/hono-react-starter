# Hono + React Fullstack Starter

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Bun](https://img.shields.io/badge/Runtime-Bun-f9f1e1)
![Hono](https://img.shields.io/badge/Backend-Hono%204-e36002)
![React](https://img.shields.io/badge/Frontend-React%2019-61dafb)
![Drizzle](https://img.shields.io/badge/ORM-Drizzle-c5f74f)
![Better Auth](https://img.shields.io/badge/Auth-Better%20Auth-8b5cf6)

Template starter fullstack **TypeScript** — satu repo, satu dev server, siap production.

| Layer | Teknologi |
| --- | --- |
| Frontend | React 19 + Vite |
| Backend | Hono 4 (Web Standard, fetch-based) |
| Runtime | Bun |
| Database | PostgreSQL + Drizzle ORM |
| Autentikasi | Better Auth: sesi cookie + JWT (bearer) + RBAC berbasis permission |
| Data fetching | TanStack Query (React Query) |
| Form | React Hook Form + Zod |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Bahasa | TypeScript (strict) |

## Fitur

- **Satu dev server, satu port** — `@hono/vite-dev-server` menjalankan Hono di atas Vite. React dapat HMR (Fast Refresh), API dapat hot reload.
- **Database terpasang** — Drizzle ORM + driver `postgres` (postgres.js), schema di `src/server/db/`, migrasi versioned di `drizzle/`.
- **Autentikasi siap pakai** — Better Auth: sign-up / sign-in email-password, sesi via cookie, tabel auth dibuat lewat migrasi.
- **JWT untuk API client** — `GET /api/auth/token` menerbitkan JWT (EdDSA, 15 menit) yang diverifikasi stateless lewat JWKS (`/api/auth/jwks`). Semua route API menerima sesi cookie **atau** `Authorization: Bearer <jwt>`.
- **RBAC berbasis permission** — role `admin` / `user` dipetakan ke permission (`src/shared/permissions.ts`, dipakai server & client). Middleware `requireAuth` / `requireRole(...)` / `requirePermission({...})`; akun admin via `bun run db:seed`.
- **Shared schema** — `src/shared/` berisi tipe & validasi Zod dipakai frontend DAN backend (satu sumber kebenaran, tanpa drift).
- **Data fetching & form** — TanStack Query untuk state server, React Hook Form + `zodResolver` untuk form.
- **Notes per-user** — contoh resource yang wajib login dan dibatasi ke pemiliknya (`user_id` + `requireAuth`).
- **Production hardening** — env fail-fast (secret, `https://` origin), header keamanan (`secureHeaders`), batas ukuran body, request ID, rate limiting auth, IP asli di belakang proxy, health check yang mengecek DB, graceful shutdown, migrasi otomatis saat start, cache header asset.
- **Test otomatis** — `bun test`: integrasi API (auth, RBAC, notes) terhadap database test + test komponen React (happy-dom + Testing Library).
- **Docker & CI** — `Dockerfile` multi-stage, `docker-compose.yml` (app + PostgreSQL), GitHub Actions (typecheck, lint, test, build, smoke test, docker build).
- **shadcn/ui siap pakai** — komponen `Button`, `Card`, `Badge`, `Input`, `Label`, `Checkbox`, `Textarea`, `Separator`, `Skeleton`.

## Struktur

```
hono-react-starter/
├── Dockerfile              # Image production (multi-stage, oven/bun)
├── docker-compose.yml      # Stack lokal: app + PostgreSQL
├── .github/workflows/ci.yml# CI: typecheck, lint, test, build, smoke, docker
├── tests/
│   ├── server/             # Test integrasi API (bun test, DB test)
│   └── ui/                 # Test komponen React (happy-dom + Testing Library)
├── index.html              # Shell SPA (dev: ditransform Vite, prod: hasil build)
├── vite.config.ts          # React + Tailwind + Hono dev server + alias @
├── components.json         # Konfigurasi shadcn/ui
├── drizzle.config.ts       # Konfigurasi Drizzle Kit
├── drizzle/                # Migrasi SQL versioned (di-generate)
├── .env.example            # Contoh environment variables
└── src/
    ├── main.tsx            # Entry React (ErrorBoundary + QueryClientProvider)
    ├── App.tsx             # Demo: auth + notes + API
    ├── index.css           # Tailwind v4 + tema shadcn
    ├── components/
    │   ├── ui/             # Komponen shadcn/ui
    │   └── error-boundary.tsx
    ├── lib/
    │   ├── utils.ts        # Helper cn()
    │   ├── auth-client.ts  # Client Better Auth untuk React
    │   ├── query-client.ts # Konfigurasi TanStack Query
    │   └── api/            # Hooks data fetching (TanStack Query + shared schema)
    │       ├── request.ts  #   helper fetch + ApiError (kode error dari API)
    │       ├── notes.ts    #   useNotes, useCreateNote, useToggleNote, useDeleteNote
    │       └── admin.ts    #   useAdminUsers
    ├── shared/             # ⭐ Tipe & validasi Zod dipakai frontend+backend
    │   ├── api.ts          #   Error response, health, hello
    │   ├── auth.ts         #   AdminUser, JwtPayload, signInSchema, signUpSchema
    │   ├── permissions.ts  #   RBAC: statements, roles, can() (server + client)
    │   ├── notes.ts        #   Note + schema create/update
    │   └── index.ts        #   Barrel export
    └── server/
        ├── index.ts        # Entry: serve + graceful shutdown
        ├── app.ts          # App Hono (middleware, API, auth, static, SPA fallback)
        ├── auth.ts         # Better Auth (admin+ac, bearer, jwt, rate limit, proxy IP)
        ├── env.ts          # Validasi environment variables (fail-fast)
        ├── middleware/
        │   └── auth.ts     # requireAuth / requireRole / requirePermission (sesi atau JWT)
        ├── routes/
        │   ├── api.ts      # Endpoint contoh
        │   ├── notes.ts    # CRUD notes per-user (requireAuth + validasi shared)
        │   └── admin.ts    # Route khusus admin (list users)
        └── db/
            ├── index.ts    # Koneksi database (postgres.js + drizzle)
            ├── schema.ts   # Schema: notes, rate_limit, tabel auth
            ├── auth-schema.ts # Schema auth (di-generate Better Auth CLI)
            ├── migrate.ts  # Runner migrasi
            └── seed.ts     # Seed akun admin
```

## Quick Start

```bash
# Prasyarat: Bun + PostgreSQL lokal
# macOS: brew install postgresql@17 && brew services start postgresql@17

cp .env.example .env          # isi BETTER_AUTH_SECRET (openssl rand -base64 32)
createdb hono_react_starter   # sekali saja

bun install
bun run db:migrate            # buat tabel (notes, auth, rate_limit)
bun run db:seed               # opsional: akun admin
bun run dev                   # http://localhost:3000
```

Atau seluruh stack via Docker: `docker compose up --build` (app + PostgreSQL).

> **Penting:** `dev` memakai `bunx --bun vite` agar Vite berjalan di runtime
> Bun (server mengimpor `hono/bun`).

## Environment Variables

Semua env di `.env` (jangan di-commit). Salin `.env.example` lalu sesuaikan.

| Variabel | Wajib | Default | Keterangan |
| --- | --- | --- | --- |
| `DATABASE_URL` | Ya (production) | `postgresql://localhost:5432/hono_react_starter` (dev) | URL koneksi PostgreSQL. Fail-fast di production bila kosong |
| `BETTER_AUTH_SECRET` | Ya | — | Rahasia Better Auth, min 32 karakter. Buat: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Ya (production) | `http://localhost:PORT` (dev) | Origin publik aplikasi, mis. `https://app.example.com`. Wajib `https://` di production (trusted origin + cookie Secure) |
| `PORT` | Tidak | `3000` | Port server (dev & production) |
| `TEST_DATABASE_URL` | Tidak | `DATABASE_URL` + akhiran `_test` | Database untuk `bun test` (tidak pernah memakai DB dev) |
| `ADMIN_EMAIL` | Ya (production, saat seed) | `admin@example.com` (dev) | Email akun admin saat `db:seed` |
| `ADMIN_PASSWORD` | Ya (production, saat seed) | `admin123456` (dev) | Password admin saat `db:seed`, min 8 karakter |
| `ADMIN_NAME` | Tidak | `Admin` | Nama admin saat `db:seed` |

## Script

| Script | Deskripsi |
| --- | --- |
| `bun run dev` | Dev server (Hono + Vite, HMR) |
| `bun run build` | Typecheck (`tsc -b`) + build client ke `dist/` |
| `bun run start` | Migrasi otomatis + server production (port dari `PORT`) |
| `bun run preview` | Build lalu start production |
| `bun run typecheck` | Cek tipe TypeScript |
| `bun run lint` | Lint dengan Oxlint |
| `bun run test` | Semua test (server + UI) |
| `bun run test:server` | Test integrasi API terhadap database test |
| `bun run test:ui` | Test komponen React (happy-dom) |
| `bun run check` | typecheck + lint + test (sama seperti CI) |
| `bun run db:test:create` | Buat database test lokal (`hono_react_starter_test`) |
| `bun run db:generate` | Generate migrasi Drizzle dari schema |
| `bun run db:migrate` | Terapkan migrasi ke database |
| `bun run db:push` | Push schema langsung (tanpa migrasi versioned) |
| `bun run db:studio` | Buka Drizzle Studio untuk inspeksi data |
| `bun run db:seed` | Buat / upgrade akun admin |

## Database (Drizzle ORM + PostgreSQL)

Koneksi dibaca dari `DATABASE_URL`. **Alur kerja migrasi:**

```bash
# 1. Ubah schema di src/server/db/schema.ts
# 2. Generate file migrasi SQL
bun run db:generate
# 3. Terapkan
bun run db:migrate
```

Schema saat ini:
- `notes` — id (uuid), userId (FK → user, cascade), title, content, done, createdAt, updatedAt
- `rate_limit` — data rate limiting Better Auth (storage database)
- `user`, `session`, `account`, `verification` — tabel Better Auth
- `jwks` — kunci penandatangan JWT (kunci privat terenkripsi dengan `BETTER_AUTH_SECRET`)

## Shared Schema (`src/shared/`)

Tipe dan validasi untuk kontrak API ditulis **sekali**, dipakai server (validasi
input) dan client (tipe data / form):

```ts
// src/shared/notes.ts
export const noteCreateSchema = z.object({
  title: z.string().trim().min(1, 'title wajib diisi').max(200),
  content: z.string().optional().default(''),
})
export type NoteCreateInput = z.infer<typeof noteCreateSchema>
```

- **Server**: `noteCreateSchema.safeParse(body)` di `routes/notes.ts` → 400 `VALIDATION_ERROR` + detail field
- **Client**: `import type { Note, AdminUser } from '@/shared'` di komponen

Aturan: isi `src/shared/` harus **runtime-agnostic** (tanpa DOM/Node API) agar
aman dipakai di kedua sisi. Client mengimpor via alias `@/shared`, server via
path relatif (karena runtime Bun tidak kenal alias).

## Data Fetching & Form

### TanStack Query (`src/lib/api/`, `src/lib/query-client.ts`)

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
- Konfigurasi di `src/lib/query-client.ts` (staleTime, retry, refetchOnWindowFocus)

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
Form auth (masuk/daftar) memakai `signInSchema` / `signUpSchema` dari `src/shared/auth.ts`.

## Autentikasi (Better Auth)

- Konfigurasi: `src/server/auth.ts` (adapter Drizzle, email/password, admin plugin, rate limit, `trustHost`)
- Endpoint: semua request `POST`/`GET` ke `/api/auth/*` ditangani Better Auth
- Client React: `src/lib/auth-client.ts` (`useSession()`, `signIn`, `signUp`, `signOut`)

**Menambah plugin** (mis. OAuth Google, two-factor):

```bash
# 1. Tambahkan plugin di src/server/auth.ts
# 2. Regenerate schema auth + migrasi
bunx better-auth generate --config src/server/auth.ts --output src/server/db/auth-schema.ts -y
bun run db:generate && bun run db:migrate
# 3. Client plugin di src/lib/auth-client.ts
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

- Klaim JWT: `sub`, `id`, `email`, `name`, `role` (+ `iss`, `aud`, `exp`, `iat`) — lihat `definePayload` di `src/server/auth.ts` dan `jwtPayloadSchema` di `src/shared/auth.ts`.
- Kunci: EdDSA (Ed25519) di tabel `jwks`; publik di `GET /api/auth/jwks` sehingga **service lain** bisa memverifikasi token tanpa memanggil server ini.
- `GET /api/auth/get-session` juga mengirim JWT di header `set-auth-jwt`.
- Di UI, kartu Autentikasi punya tombol **Buat token** sebagai demo.
- Karena stateless, perubahan role/ban baru berlaku saat token berikutnya diterbitkan (maks. 15 menit). Untuk kebutuhan pencabutan instan, pakai session token.

## RBAC (Role-Based Access Control)

Role disimpan di kolom `user.role` (`admin` / `user`, default `user`). Permission
didefinisikan **sekali** di `src/shared/permissions.ts` (Better Auth access control)
dan dipakai server maupun client:

```ts
// src/shared/permissions.ts
export const statements = { ...defaultStatements, note: ['create', 'read', 'update', 'delete'] } as const
export const roles = {
  user: ac.newRole({ note: ['create', 'read', 'update', 'delete'] }),
  admin: ac.newRole({ ...adminAc.statements, note: ['create', 'read', 'update', 'delete'] }),
}
can('user', { user: ['list'] }) // false
```

**Melindungi route di Hono** (`src/server/middleware/auth.ts`) — semua menerima sesi cookie atau JWT:

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

| Method | Path | Deskripsi |
| --- | --- | --- |
| GET | `/api/health` | Status server + cek koneksi DB (`503` bila DB tidak bisa dihubungi) |
| GET | `/api/hello?name=...` | Contoh query param |
| POST | `/api/echo` | Contoh body JSON (`400` bila bukan JSON) |
| GET | `/api/notes` | Daftar notes milik user login (`401` tanpa sesi) |
| POST | `/api/notes` | Buat note (validasi zod) |
| PATCH | `/api/notes/:id` | Update note milik sendiri (`404` bila bukan pemilik) |
| DELETE | `/api/notes/:id` | Hapus note milik sendiri |
| GET | `/api/admin/users` | Daftar user (permission `user:list` → admin) |
| GET | `/api/admin/me` | Identitas pemanggil + `authMethod` (`session`/`jwt`) |
| GET | `/api/auth/token` | Terbitkan JWT untuk sesi saat ini |
| GET | `/api/auth/jwks` | Kunci publik (JWKS) untuk verifikasi JWT |
| POST | `/api/auth/sign-up/email` | Daftar akun |
| POST | `/api/auth/sign-in/email` | Masuk |
| GET | `/api/auth/get-session` | Ambil sesi |
| POST | `/api/auth/sign-out` | Keluar |

## Alur Menambah Fitur

Pola yang dipakai di template ini (agar tetap mudah di-maintain):

1. **Schema** → tulis tipe & validasi di `src/shared/<fitur>.ts` (Zod)
2. **Database** → tambah tabel di `src/server/db/schema.ts`, lalu `db:generate` + `db:migrate`
3. **API** → buat router di `src/server/routes/<fitur>.ts`, validasi dengan schema shared, mount di `src/server/index.ts` (pasang `requireAuth` / `requireAdmin` bila perlu)
4. **Hooks** → buat query/mutation di `src/lib/api/<fitur>.ts` (TanStack Query + zod parse)
5. **UI** → komponen baru di `src/` memakai hooks + React Hook Form (bila ada form) + komponen shadcn

## Menambah Komponen shadcn/ui

```bash
bunx shadcn add button dialog form table
```

## Testing

Test memakai `bun test` bawaan (tanpa Vitest/Jest).

```bash
bun run db:test:create   # sekali: database test lokal
bun run test             # server + UI
```

- **`tests/server/`** — test integrasi: memanggil `app.fetch` langsung (tanpa port) terhadap
  database test. Preload `tests/server/setup.ts` mengarahkan `DATABASE_URL` ke DB test
  (`TEST_DATABASE_URL` atau nama DB + `_test`), menjalankan migrasi, lalu mengosongkan tabel.
  Rate limit Better Auth otomatis nonaktif saat `NODE_ENV=test`.
- **`tests/ui/`** — test komponen React dengan happy-dom + Testing Library. Contoh
  `app.test.tsx` menunjukkan pola mock `useSession` (via `mock.module`) dan `fetch`.

## Security & Hardening

Yang sudah terpasang di `src/server/app.ts` / `auth.ts`:

| Area | Implementasi |
| --- | --- |
| Env | Fail-fast: `BETTER_AUTH_SECRET` ≥ 32 char, `DATABASE_URL` & `BETTER_AUTH_URL` (https) wajib di production |
| Header | `secureHeaders()` — nosniff, `X-Frame-Options: DENY`, Referrer-Policy, HSTS (production) |
| Body | `bodyLimit` 1 MB untuk `/api/*` → `413` |
| Cache | `/api/*` → `no-store`; `/assets/*` immutable 1 tahun; `index.html` no-cache |
| Auth | Cookie sesi HttpOnly (Secure saat https), CSRF via `trustedOrigins`, rate limit 20 req/menit/IP/endpoint, IP asli dari `cf-connecting-ip` / `x-real-ip` / `x-forwarded-for` |
| JWT | EdDSA via JWKS, `iss`/`aud` = `BETTER_AUTH_URL`, exp 15 menit, kunci privat terenkripsi di DB; token dimanipulasi → 401 |
| RBAC | Permission dicek di server per route (`requirePermission`); role dari sesi atau klaim JWT yang sudah diverifikasi |
| Data | Notes dibatasi ke pemilik di level query; respons admin berupa DTO (tanpa hash password) |
| Error | `onError` → JSON generik + log dengan `X-Request-Id`, tidak bocorkan stack |

Belum terpasang (tambahkan sesuai kebutuhan): Content-Security-Policy (dinonaktifkan agar HMR Vite
tidak terblokir), verifikasi email, CORS (tidak perlu karena satu origin).

## Deployment

App memakai Web Standard (fetch) sehingga bisa dideploy di banyak platform.

**Docker (direkomendasikan):**

```bash
docker build -t hono-react-starter .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
  -e BETTER_AUTH_URL=https://app.example.com \
  hono-react-starter
```

Image menjalankan migrasi otomatis lalu serve, dengan `HEALTHCHECK` ke `/api/health`.
Untuk lokal: `docker compose up --build`.

**Checklist go-live:**

1. `BETTER_AUTH_URL` = origin https publik; reverse proxy meneruskan `X-Forwarded-For` (atau `CF-Connecting-IP`).
2. `BETTER_AUTH_SECRET` unik per environment, `DATABASE_URL` dengan user berhak DDL (untuk migrasi otomatis) — atau jalankan `bun run db:migrate` terpisah dan ubah `start`.
3. Seed admin: `ADMIN_EMAIL=... ADMIN_PASSWORD=... NODE_ENV=production bun run db:seed`.
4. Pantau `/api/health` (mengembalikan `503` saat DB down) dan log `X-Request-Id`.
5. Backup PostgreSQL terjadwal.

**Tanpa Docker (VPS/Railway/Fly):**

```bash
export DATABASE_URL=postgresql://user:pass@host/db
export BETTER_AUTH_SECRET=$(openssl rand -base64 32)
export BETTER_AUTH_URL=https://app.example.com
export PORT=3000

bun install --frozen-lockfile
bun run build
bun run start    # migrasi otomatis, lalu serve production
```

**Vercel / Cloudflare Workers:** tambahkan adapter `@hono/vercel` /
`@hono/cloudflare-workers`, build client dengan `bun run build`, dan sesuaikan
entry server sesuai platform.

## Troubleshooting

| Masalah | Solusi |
| --- | --- |
| `dev` gagal dengan `Bun is not defined` | Jalankan Vite di runtime Bun — sudah otomatis via `bunx --bun vite`; jangan panggil `vite` langsung |
| PostgreSQL gagal start di macOS (`postmaster became multithreaded`) | Set locale valid: `LC_ALL=en_US.UTF-8` saat start (`pg_ctl` / service) |
| Port 3000 sudah terpakai (mis. VS Code) | Vite otomatis pilih port berikutnya, atau set `PORT=3100` |
| `EADDRINUSE` saat start | Bun v1.2 auto-serve dari default export — jangan panggil `Bun.serve` manual di entry |
| Migrasi gagal `multiple primary keys` | Migrasi lama yang merubah PK perlu diedit manual (keterbatasan drizzle-kit) |
| `BETTER_AUTH_SECRET` error saat start | Pastikan env terisi ≥32 karakter (lihat `.env.example`) |
| `BETTER_AUTH_URL harus https://` saat start production | Set origin publik https; untuk uji lokal pakai `NODE_ENV` selain production |
| `bun test` gagal menyiapkan database | Jalankan `bun run db:test:create` atau set `TEST_DATABASE_URL` |
| Migrasi `0005` gagal (`user_id` NOT NULL) | Tabel `notes` berisi data tanpa pemilik — lihat komentar di `drizzle/0005_notes_user_id.sql` |

## Roadmap

- [x] Proteksi route notes per-user (pemilik catatan)
- [x] Test otomatis (bun test + Testing Library)
- [x] Dockerfile + CI (GitHub Actions)
- [ ] OAuth Google/GitHub (plugin Better Auth)
- [ ] Verifikasi email (plugin Better Auth + provider email)
- [ ] React Router untuk multi-halaman
- [ ] Content-Security-Policy (nonce) di production
