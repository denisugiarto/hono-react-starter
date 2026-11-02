# AGENTS.md — panduan untuk agen AI (Claude Code, Codex, Antigravity, dll.)

Monorepo Nx + Bun: `apps/api` (Hono, Better Auth, Drizzle/PostgreSQL), `apps/web` (React 19, Vite,
TanStack Query, shadcn/ui), `packages/shared` (schema Zod + RBAC, dipakai keduanya), `apps/e2e`
(Playwright). Dokumentasi manusia: `README.md` (arsitektur, env, API, komponen), `docs/QA.md` (tester),
`DEVELOPMENT_PROGRESS.md` (riwayat; satu entri per commit fitur/komponen).

## Skill — muat sebelum mengerjakan

Skill = `SKILL.md` di `.agents/skills/<nama>/` (Codex, Antigravity) = `.claude/skills/` (Claude Code;
`.agents/skills` symlink ke sana). Memuat: Claude Code lewat tool Skill atau `/<nama>`; Codex/Antigravity
baca SKILL.md-nya lalu ikuti. Prioritas bila bertentangan: aturan di file ini → skill proyek
(`adding-feature`, `db-migrations`, `writing-tests`, `auditing-actions`, `adding-shadcn-component`,
`verifying-changes`) → skill umum.

**Mode dasar setiap tugas kode:** `ponytail` — perubahan terkecil yang menyelesaikan seluruh tugas.
Ponytail memangkas abstraksi dan opsi yang tidak diminta; ia **tidak memangkas** test (coverage 90 %),
story, `data-testid`, dan pembaruan dokumen yang diwajibkan di "Aturan keras". Pengguna mematikannya
dengan "stop ponytail".

Rute per tugas — muat berurutan, lewati yang tidak kena:

| Tugas | Skill |
| --- | --- |
| Resource/endpoint/halaman baru | `adding-feature` → `tdd` → `db-migrations` (schema berubah) → `auditing-actions` (route mutasi/auth) → `writing-tests` |
| Bug, test/CI merah, perilaku aneh | `systematic-debugging` → `writing-tests` |
| Komponen/tampilan UI | `adding-shadcn-component` (dari registry shadcn) → `react-patterns` → `impeccable` → `accessibility` |
| Review UI tanpa mengubah desain | `web-design-guidelines`, `accessibility` |
| Halaman lambat, bundle besar, Web Vitals | `web-perf` |
| Menulis/memperbaiki test | `writing-tests` (+ `react-testing` untuk `apps/web`, `playwright-best-practices` untuk `apps/e2e`; bila keduanya berbeda dari `writing-tests` — mis. Vitest/MSW — `writing-tests` yang berlaku: bun test, `apiMock`) |
| Better Auth: plugin, session, adapter, endpoint auth | `better-auth-best-practices` → `db-migrations` → `auditing-actions` |
| Schema, indeks, relasi, query Drizzle | `drizzle` → `db-migrations` (rollout) |
| Logging, metrics, tracing, alert produksi | `observability-and-instrumentation` (pakai `c.get('log')` / `currentRequest()`) |
| Nx: project baru, boundaries, cache, affected | `nx-workspace-patterns` |
| Dockerfile/compose, GitHub Actions | `docker-expert`, `ci-cd-and-automation` |
| Review perubahan, menulis PR | `code-review`, `pr` |
| Sebelum klaim selesai, commit, push, smoke test, naik dependensi | `verifying-changes` → `verification-before-completion` (tunjukkan output perintah, baru klaim) |

## Perintah yang tidak ada di `package.json`

```bash
bunx nx run-many -t typecheck lint test build --skip-nx-cache   # persis CI (bun run check = tanpa build, pakai cache)
bunx nx build-storybook web      # ikut CI; dev: bun run --cwd apps/web storybook (:6006)
bun scripts/audit.ts             # gerbang keamanan dependensi (sama dengan CI)
```

Skrip lain (`check`, `e2e`, `db:*`) ada di `package.json` root. Test API butuh PostgreSQL lokal dan DB test
(`bun run db:test:create` sekali). Env backend di `apps/api/.env` (salin dari `.env.example`; gitignored —
tetap di luar commit).

## Aturan keras

- **Perubahan perilaku datang bersama testnya.** Coverage 90 % baris & fungsi berlaku **per file** (Bun);
  file baru ikut diuji; arrow `.catch(() => …)` dihitung fungsi.
- **Schema berubah → migrasi baru** (`bun run db:generate`; SQL lama tetap) dan **tabel baru masuk daftar
  TRUNCATE** di `apps/api/tests/setup.ts`.
- **Respons API** selalu lewat `ok(c, data, { status, message })` / `fail(c, status, CODE, message, details)`;
  kode error baru didaftarkan di `packages/shared/src/api.ts`. Mutasi di web memakai `requestEnvelope`.
- **Keamanan**: IP klien hanya dari `c.get('clientIp')`; GET daftar memakai `revalidate()`; aset dari origin
  lain → perbarui `buildCsp()`; endpoint yang menerima kredensial → `auth-guards.ts` dan aturan audit di
  `auth-audit.ts`.
- **Permission** Better Auth tanpa wildcard — tulis aksi satu per satu di `packages/shared/src/permissions.ts`.
- **UI**: sebelum membuat komponen, cek `apps/web/src/components/common/` dan bagian Komponen di README;
  pakai yang ada (`DataTable`, `VirtualList` untuk daftar ribuan baris, `SelectSearch`, `DatePicker`, `PasswordInput`, `notify`, …). Util: angka/teks `lib/format`, tanggal `lib/datetime`, panggilan API `api.*` (`lib/api/client`) + `lib/query` (keys, optimistic), debounce/throttle `hooks/use-debounce`, code-splitting `lib/lazy`. Elemen interaktif
  baru diberi `data-testid` berprefix fitur (daftar di `docs/QA.md`). Tombol: `color` + `appearance` + `size`
  (komponen shadcn baru yang memakai `variant` dimigrasi). `Button render={<Link/>}` adalah pola yang benar
  (abaikan peringatan `nativeButton`). Halaman Pengaturan/Admin → route di bawah `SidebarLayout` + entri
  `sidebarNav`. Komponen dengan state/variant → `*.stories.tsx` (Storybook dicek CI).
- **Test web** mengimpor `src/components/layout/*` dan `features/*` lewat `tests/utils.tsx`; helper murni
  ditaruh di `src/lib/*` (contoh `lib/sidebar-state.ts`).
- **Dependensi**: ubah rentang di `package.json` proyek lalu `bun install` (`bun update <pkg>` dari root
  menambah dependensi ke root — hindari). Paket transitif → `overrides` di root. Setelah naik versi Better
  Auth: regenerate schema dan bandingkan (skill `verifying-changes`).
- **Port** 3000/5173/5174 dipakai proyek lain di mesin pengembang. Smoke test di 3199/5199 dan **matikan hanya
  PID yang Anda mulai** (bukan `pkill -f bun`).
- **Commit** conventional, bahasa Indonesia, seperti riwayat (`feat(api): …`). README ikut berubah bila
  perilaku/endpoint/env berubah.

## Pola yang dipakai (ikuti, bukan buat varian baru)

- Factory + opsi untuk testabilitas: `createApp()`, `createAuth()`, `createApiRoutes()`, `createMailer()`, `createCache()`.
- Strategy lewat env: `MAIL_PROVIDER`, `CACHE_PROVIDER`; implementasi memori dipakai test.
- Decorator di lapisan auth: `maskSignUpConflict(withAuthAudit(withSignInLockout(handler)))` di `app.ts`.
- Konteks request: `c.get('log')`, `c.get('requestId')`, `c.get('user')`, `c.get('clientIp')`;
  di luar Hono pakai `currentRequest()` (AsyncLocalStorage).
