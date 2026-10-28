---
name: verifying-changes
description: Use before claiming a change in this repo is done, before committing/pushing, when CI is red, or when a smoke test needs a running server on this machine.
---

# Verifikasi Perubahan

Semua target lewat Nx (cache per proyek). Test API butuh PostgreSQL **berjalan** lokal dengan DB test (`bun run db:test:create` sekali; nama = `DATABASE_URL` + `_test`, atau set `TEST_DATABASE_URL`).

```bash
bun run check                                    # typecheck + lint + test, memakai cache Nx — cukup saat iterasi
bunx nx run-many -t typecheck lint test build --skip-nx-cache   # persis CI (plus build, tanpa cache) — sebelum push
bunx nx affected -t test                         # hanya proyek yang terdampak
bunx nx reset                                    # cache Nx aneh
```

- Lolos = `NX Successfully ran targets …`. `bun test` dengan semua test lolos tapi exit 1 = coverage per file (skill `writing-tests`).
- Perubahan UI/alur auth/route: jalankan juga E2E — `bun run e2e` (Nx build web → Playwright start `apps/api` di port 3199 dengan `SERVE_WEB_DIST=true`, migrasi, `db:seed:demo`; sekali: `bunx playwright install chromium`). Test unit web me-mock `auth-client`, jadi perilaku client Better Auth asli (mis. redirect) hanya terlihat di E2E. Gagal → baca `apps/e2e/test-results/*/error-context.md` (snapshot aksesibilitas halaman).
- Setelah CI merah di Linux saja: biasanya urutan file test berbeda (mock ter-register terlambat) — jalankan `bun test` dengan urutan file yang sama seperti log CI.

## Smoke test server

Port 3000 dan 5173/5174 sering dipakai proyek lain di mesin ini. Cek `lsof -nP -iTCP:<port> -sTCP:LISTEN`, pakai port bebas (3199/5199), dan **matikan hanya PID yang Anda mulai** — jangan `pkill -f bun`.

```bash
cd apps/api && PORT=3199 BETTER_AUTH_URL=http://localhost:3199 bun src/index.ts & PID=$!
curl -s localhost:3199/api/health/live; curl -s localhost:3199/api/health/ready
kill $PID
```

Mode production lokal: `bun run build` lalu `NODE_ENV=production BETTER_AUTH_URL=https://x.example.com PORT=3199 bun run start` dari `apps/api` (`/`, deep route, `/assets/*` harus 200). Untuk klik-klik manual di browser lewat http: `SERVE_WEB_DIST=true PORT=3199 BETTER_AUTH_URL=http://localhost:3199 bun src/index.ts` (production mode menolak origin http). Server E2E yang dibiarkan hidup di 3199 akan dipakai ulang Playwright (`reuseExistingServer`) — matikan bila env-nya berubah.

## Commit & CI

Pesan commit conventional (`feat(scope): …`, bahasa Indonesia seperti riwayat). Setelah push: `gh run list --branch main --limit 1`, `gh run watch <id> --exit-status` (TLS timeout `gh` kadang transient → ulangi). Perbarui `DEVELOPMENT_PROGRESS.md` (iterasi) dan README bila perilaku/endpoint berubah.
