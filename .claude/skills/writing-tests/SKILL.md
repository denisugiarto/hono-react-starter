---
name: writing-tests
description: Use when writing or fixing tests in apps/api, apps/web, or packages/shared, or when `bun test` passes but exits 1 (coverage threshold), or when a web test fails with "Invalid base URL", "beforeEach is not a function", or "Found multiple elements".
---

# Menulis Test (bun test, coverage ≥ 90 % PER FILE)

Bun menerapkan `coverageThreshold` di `bunfig.toml` **per file yang dimuat**: semua test lolos tetapi exit 1 = ada file dengan fungsi/baris < 90 %. Lihat kolom `Uncovered Line #s`.

## API (`apps/api/tests/*.test.ts`)

- Panggil app langsung: `call(path, { method, body: json({...}), cookie })` dari `tests/helpers.ts`; `signUp()` membuat user unik dan mengembalikan `cookie` — panggil dua kali untuk test isolasi antar user; `readData(res)` membaca `data` envelope, `readJson(res)` body mentah. Jadikan admin: `db.update(user).set({ role: 'admin' })`.
- Setiap cabang route harus dicapai: 401 tanpa cookie, 404 untuk id user lain dan id bukan UUID, 400 untuk body bukan JSON (`body: '{rusak'`) dan validasi gagal. Cabang yang tidak bisa dicapai → hapus dari kode, bukan dikecualikan.
- DB test terpisah (`TEST_DATABASE_URL` / nama DB + `_test`), migrasi + TRUNCATE sekali di `tests/setup.ts` (preload). Tabel baru → tambah ke TRUNCATE.
- Email ditangkap `MemoryMailer` (`mailer` dari `src/mailer.ts`; `MAIL_PROVIDER=memory` di setup). Tautan dari `mail.text`, panggil dengan `app.fetch(new Request(url, { redirect: 'manual' }))`.
- Kode TOTP nyata: `createOTP(secret).totp()` dari `@better-auth/utils/otp`, secret = base32-decode dari `totpURI`.
- Konfigurasi alternatif tanpa ubah env: `createApp({ isProd, rateLimit, extend })`, `createApiRoutes({ ping })`, `createAuth({ requireEmailVerification, mailer })`.
- Arrow `.catch(() => …)` dihitung sebagai fungsi oleh coverage: pastikan ada test yang memicunya (mis. JSON rusak), atau tulis `try/catch` bila jalurnya sulit dipicu.

## Web (`apps/web/tests/**/*.test.tsx`)

- Setiap file: `beforeEach(setupEach); afterEach(teardownEach)` dari `tests/utils.tsx`. Hook `bun:test` hanya boleh dipanggil di file test; memanggilnya dari modul helper memicu "beforeEach is not a function".
- `renderAt('/path')` = seluruh app (Providers + `createMemoryRouter`), mengembalikan `router` → cek `router.state.location.pathname` dengan `waitFor`.
- Sesi: `asGuest()`, `asUser({ emailVerified, twoFactorEnabled })`, `asAdmin()`; `sessionState.isPending = true` untuk skeleton. Hasil auth: `authMock.result` (sign-in/up), `authMock.responses['twoFactor.enable'] = { data, error }`; semua panggilan tercatat di `authCalls`.
- Fetch API: `tests/mocks/api.ts`. Endpoint baru = cabang `if (url === '/api/x' && method === 'GET')` di dalam `installFetchMock()` **sebelum** fallback 404, respons `jsonResponse(data, status, message)`; data in-memory + flag gagal masuk objek `apiMock` (tambahkan field di tipe dan di `resetApiMock()`), contoh `apiMock.notes`, `apiMock.fail.create`, `apiMock.auditTotal`.
- Impor mock **sebelum** modul app — `tests/utils.tsx` sudah mengatur; jangan impor `src/**` yang menyentuh `auth-client` dari file test lain secara langsung (urutan file di CI/Linux berbeda → "Invalid base URL: null").
- Selector: `CardTitle` bukan heading → `getByText`; teks toast muncul ganda (live region) → `findAllByText`; header punya link "Masuk" juga → `within(container)`.
- Navigasi setelah aksi sukses ke route ber-`RequireAuth` butuh `asUser()` dulu, kalau tidak dipantulkan ke `/login`.
- `src/components/ui/**`, `main.tsx`, `app/router.tsx` dikecualikan dari coverage; helper murni taruh di `src/lib/format.ts` agar bisa diuji tanpa React (dan tidak memicu peringatan `only-export-components`).

## Shared (`packages/shared/tests`)

Setiap schema baru: satu test positif + negatif; callback `.refine/.transform` harus dipanggil, kalau tidak `% Funcs` file itu 0.
