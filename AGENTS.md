# AGENTS.md — panduan untuk agen AI (Claude Code, Codex, Antigravity, dll.)

Monorepo Nx + Bun: `apps/api` (Hono, Better Auth, Drizzle/PostgreSQL), `apps/web` (React 19, Vite,
TanStack Query, shadcn/ui), `packages/shared` (schema Zod + RBAC, dipakai keduanya), `apps/e2e`
(Playwright). Dokumentasi manusia: `README.md` (arsitektur, env, API), `docs/QA.md` (tester),
`DEVELOPMENT_PROGRESS.md` (riwayat iterasi — tambah entri setiap perubahan berarti).

## Skill — muat sebelum mengerjakan, bukan setelah

Skill = `SKILL.md` di `.agents/skills/<nama>/` (Codex, Antigravity) = `.claude/skills/` (Claude Code; `.agents/skills`
symlink ke sana). Cara memuat: Claude Code lewat tool Skill atau `/<nama>`; Codex/Antigravity baca file SKILL.md-nya
lalu ikuti. Prioritas bila bertentangan: aturan di file ini → skill proyek (`adding-feature`, `db-migrations`,
`writing-tests`, `auditing-actions`, `adding-shadcn-component`, `verifying-changes`) → skill umum.

**Mode dasar setiap tugas kode:** `ponytail` (perubahan terkecil yang menyelesaikan seluruh tugas; pengguna bisa
mematikannya dengan "stop ponytail"), dan sebelum menyatakan selesai/commit: `verifying-changes` lalu
`verification-before-completion` (bukti perintah lolos, baru klaim).

Rute per tugas — muat berurutan; lewati yang tidak kena:

| Tugas | Skill |
| --- | --- |
| Resource/endpoint/halaman baru | `adding-feature` → `tdd` → `db-migrations` (schema berubah) → `auditing-actions` (route mutasi/auth) → `writing-tests` |
| Bug, test/CI merah, perilaku aneh | `systematic-debugging` → `writing-tests`. Rujukan `superpowers:test-driven-development` / `superpowers:verification-before-completion` di dalamnya = `tdd` / `verification-before-completion` di sini |
| Komponen/tampilan UI | `adding-shadcn-component` (dari registry shadcn) → `react-patterns` → `impeccable` (desain, polish, empty state) → `accessibility` |
| Review UI cepat tanpa mengubah desain | `web-design-guidelines`, `accessibility` |
| Halaman lambat, bundle besar, Web Vitals | `web-perf` |
| Menulis/memperbaiki test | `writing-tests` (+ `react-testing` untuk `apps/web`, `playwright-best-practices` untuk `apps/e2e`) |
| Better Auth: plugin, session, adapter, endpoint auth | `better-auth-best-practices` → `db-migrations` → `auditing-actions` |
| Query lambat, indeks, pagination | `sql-optimization` |
| Dockerfile/compose, GitHub Actions | `docker-expert`, `ci-cd-and-automation` |
| Review perubahan, menulis PR | `code-review`, `pr` |
| Sebelum klaim selesai, commit, push, smoke test, naik dependensi | `verifying-changes` → `verification-before-completion` |

## Perintah

```bash
bun install                      # setelah pull yang mengubah bun.lock
bun run check                    # typecheck + lint + test (Nx, cache)
bunx nx run-many -t typecheck lint test build --skip-nx-cache   # persis CI
bun run e2e                      # Playwright (build web → server :3199 → browser)
bun run --cwd apps/web storybook # Storybook :6006; build: bunx nx build-storybook web (ikut CI)
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
  `Button render={<Link/>}` adalah pola yang benar (abaikan peringatan `nativeButton`). Input password →
  `PasswordInput` (`components/common`). Tombol: `color` + `appearance` + `size`; prop `variant` tidak ada (komponen shadcn baru yang memakainya harus dimigrasi). Halaman Pengaturan/Admin → route di bawah `SidebarLayout` +
  entri `sidebarNav`. Komponen dengan state/variant → tambahkan `*.stories.tsx` (Storybook dicek CI). Tabel data → `DataTable`; KPI → `StatCard`; bilah atas → `Navbar`; pencarian → `SearchInput`; pilihan dengan cari → `SelectSearch`; menu aksi → `Dropdown`; tag → `Chip`; tanggal/jam → `DatePicker`/`DateRangePicker`/`TimePicker` + `lib/datetime`; wizard → `Stepper`; toast → `notify` (`lib/toast`).
- **Test web**: jangan impor modul `src/components/layout/*` atau `features/*` secara statis dari file test sebelum `tests/utils.tsx` — tarik helper murni ke `src/lib/*` (contoh `lib/sidebar-state.ts`).
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
