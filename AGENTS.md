# AGENTS.md — panduan untuk agen AI (Claude Code, Codex, Antigravity, dll.)

Monorepo Nx + Bun: `apps/api` (Hono, Better Auth, Drizzle/PostgreSQL), `apps/web` (React 19, Vite,
TanStack Query, shadcn/ui), `packages/shared` (schema Zod + RBAC, dipakai keduanya), `apps/e2e`
(Playwright). Dokumentasi manusia: `README.md` (arsitektur, env, API), `docs/QA.md` (tester),
`DEVELOPMENT_PROGRESS.md` (riwayat iterasi — tambah entri setiap perubahan berarti).

## Skill (baca sebelum mengerjakan tugas yang cocok)

Skill ada di `.agents/skills/<nama>/SKILL.md` (Codex, Antigravity) = `.claude/skills/` (Claude Code;
`.agents/skills` adalah symlink ke sana). Satu sumber, tiga agen.

| Skill | Pakai saat |
| --- | --- |
| `adding-feature` | Menambah resource/halaman/endpoint: urutan shared → migrasi → api → web → test → OpenAPI → dokumen |
| `db-migrations` | Mengubah schema Drizzle, menambah plugin Better Auth, error "relation does not exist" |
| `writing-tests` | Menulis/memperbaiki test api/web/shared/e2e; `bun test` lolos tapi exit 1; error mock web |
| `auditing-actions` | Route yang mengubah data atau endpoint auth baru harus tercatat di `audit_log` |
| `adding-shadcn-component` | `bunx shadcn add` menulis ke folder salah / import `cn` rusak |
| `verifying-changes` | Sebelum menyatakan selesai, commit, smoke test, CI merah, menaikkan dependensi |

## Perintah

```bash
bun install                      # setelah pull yang mengubah bun.lock
bun run check                    # typecheck + lint + test (Nx, cache)
bunx nx run-many -t typecheck lint test build --skip-nx-cache   # persis CI
bun run e2e                      # Playwright (build web → server :3199 → browser)
bun scripts/audit.ts             # gerbang keamanan dependensi (sama dengan CI)
bun run db:generate              # migrasi dari perubahan schema (lihat skill db-migrations)
bun run db:seed:demo             # akun demo (docs/QA.md)
```

Test API butuh PostgreSQL lokal dan DB test (`bun run db:test:create` sekali). Env backend di
`apps/api/.env` (salin dari `.env.example`; JANGAN commit).

## Aturan keras

- **Jangan ubah perilaku tanpa test.** Coverage 90 % baris & fungsi berlaku **per file** (Bun). File
  baru wajib diuji; arrow `.catch(() => …)` dihitung fungsi.
- **Tabel baru → tambahkan ke daftar TRUNCATE** di `apps/api/tests/setup.ts` dan buat migrasi
  (`bun run db:generate`), jangan edit SQL lama.
- **Respons API** selalu lewat `ok(c, data, { status, message })` / `fail(c, status, CODE, message, details)`;
  kode error baru didaftarkan di `packages/shared/src/api.ts`. Mutasi di web memakai `requestEnvelope`.
- **Keamanan**: IP klien hanya dari `c.get('clientIp')` (jangan baca `x-forwarded-for` sendiri); GET daftar
  memakai `revalidate()`; aset dari origin lain → perbarui `buildCsp()`; endpoint yang menerima
  kredensial → pertimbangkan `auth-guards.ts` dan aturan audit di `auth-audit.ts`.
- **Permission** Better Auth tidak punya wildcard — tulis aksi satu per satu di
  `packages/shared/src/permissions.ts`.
- **UI**: elemen interaktif baru diberi `data-testid` berprefix fitur (daftar di `docs/QA.md`);
  `Button render={<Link/>}` adalah pola yang benar (abaikan peringatan `nativeButton`).
- **Dependensi**: ubah rentang di `package.json` proyek lalu `bun install`; JANGAN `bun update <pkg>`
  dari root (menambah dependensi ke root). Paket transitif → `overrides` di root. Setelah naik versi
  Better Auth: regenerate schema dan bandingkan (skill `verifying-changes`).
- **Port** 3000/5173/5174 dipakai proyek lain di mesin pengembang. Smoke test di 3199/5199 dan
  **matikan hanya PID yang Anda mulai** — jangan `pkill -f bun`.
- **Commit** conventional, bahasa Indonesia, seperti riwayat (`feat(api): …`). Perbarui README bila
  perilaku/endpoint/env berubah, dan `DEVELOPMENT_PROGRESS.md` per iterasi.

## Pola yang dipakai (ikuti, jangan buat varian baru)

- Factory + opsi untuk testabilitas: `createApp()`, `createAuth()`, `createApiRoutes()`, `createMailer()`, `createCache()`.
- Strategy lewat env: `MAIL_PROVIDER`, `CACHE_PROVIDER`; implementasi memori dipakai test.
- Decorator di lapisan auth: `maskSignUpConflict(withAuthAudit(withSignInLockout(handler)))` di `app.ts`.
- Konteks request: `c.get('log')`, `c.get('requestId')`, `c.get('user')`, `c.get('clientIp')`;
  di luar Hono pakai `currentRequest()` (AsyncLocalStorage).
