# Panduan QA / Tester

Dokumen ini untuk penguji manual maupun yang menulis test otomatis. Ringkasnya:
siapkan server dengan **akun demo**, pakai **dokumentasi API** untuk mencoba endpoint,
ikuti **skenario uji**, dan gunakan **selector `data-testid`** bila membuat test browser.

## 1. Menyiapkan lingkungan uji

Pilih salah satu:

| Cara | Perintah | Cocok untuk |
| --- | --- | --- |
| Lokal, seperti production | `bun run build` lalu `SERVE_WEB_DIST=true API_DOCS_ENABLED=true bun run --cwd apps/api dev` | Uji manual cepat di http://localhost:3000 (satu proses: frontend + API) |
| Lokal, mode pengembangan | `bun run dev` | Uji sambil mengubah kode (web http://localhost:5173, API :3000) |
| Staging (HTTPS) | `docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --build` | Tester tim dari luar; lihat `deploy/staging/.env.staging.example` |
| Otomatis (Playwright) | `bun run e2e` | Regresi end-to-end di browser asli |

Setelah server jalan, buat/reset data demo (idempoten, boleh diulang kapan pun untuk
mengembalikan skenario ke kondisi awal):

```bash
bun run db:seed:demo                       # lokal (DATABASE_URL dari apps/api/.env)
docker compose --env-file .env.staging -f docker-compose.staging.yml run --rm seed   # staging
```

> Di production seed demo **ditolak** (password publik) kecuali `ALLOW_DEMO_SEED=true`.

## 2. Akun demo

Sumber: `packages/shared/src/demo.ts` (dipakai seed, test API, dan Playwright).

| Akun | Email | Password | Role | Keadaan |
| --- | --- | --- | --- | --- |
| Admin | `admin@example.com` | `admin123456` | admin | Akses Pengguna & Audit log |
| Pengguna | `user@example.com` | `user123456` | user | Punya 3 catatan contoh |
| 2FA | `totp@example.com` | `totp123456` | user | 2FA aktif, secret tetap `HONOREACTSTARTERDEMOTOTPSECRET32` |
| Diblokir | `banned@example.com` | `banned123456` | user | `banned=true`, login ditolak |

**Kode 2FA.** Tambahkan secret di atas ke aplikasi authenticator (Google Authenticator,
1Password, Aegis, …) sebagai *time-based, 6 digit, 30 detik* — atau pindai URI `otpauth://`
yang dicetak `bun run db:seed:demo`. Kode cadangan tetap: `demo1-aaaaa`, `demo2-bbbbb`,
`demo3-ccccc`, `demo4-ddddd`, `demo5-eeeee` (sekali pakai; seed ulang mengembalikannya).

**Email.** Dengan `MAIL_PROVIDER=console` (default dev/staging) email tidak dikirim; tautan
verifikasi / reset password muncul di **log server** (`subject`, `to`, dan isi `text`
termasuk URL). Cari baris `email` di log, lalu buka URL-nya di browser.

## 3. Dokumentasi API

- `GET /api/openapi.json` — spesifikasi OpenAPI 3.0 (dari schema Zod `packages/shared`).
- `GET /api/docs` — UI interaktif (Scalar): coba endpoint langsung dari browser, atau impor
  `openapi.json` ke Postman/Insomnia/Bruno.

Aktif otomatis di luar production; di production/staging nyalakan dengan `API_DOCS_ENABLED=true`.
Autentikasi dari alat luar browser: `POST /api/auth/sign-in/email` → header `set-auth-token`
(session token) → `GET /api/auth/token` dengan `Authorization: Bearer <session token>` → JWT
untuk semua endpoint `/api/*`. Lihat README bagian "JWT".

## 4. Skenario uji manual

Centang per rilis. Hasil yang diharapkan ditulis setelah `→`.

**Autentikasi**
- [ ] Daftar akun baru → masuk otomatis, halaman Catatan kosong, email verifikasi tercatat di log.
- [ ] Masuk `user@example.com` password salah → pesan error, tetap di `/login`.
- [ ] Masuk benar → ke `/notes`; refresh halaman → tetap masuk.
- [ ] Buka `/notes` saat belum masuk → dialihkan ke `/login`, setelah masuk kembali ke `/notes`.
- [ ] Masuk `banned@example.com` → ditolak dengan pesan.
- [ ] Keluar dari menu pengguna → tombol Masuk kembali tampil; `/notes` kembali dialihkan.
- [ ] Lupa password → kirim email → tautan di log → atur password baru → masuk dengan password baru
      (sesi lama tercabut).
- [ ] Ganti password di Keamanan (dengan "cabut sesi lain") → sesi di tab/browser lain keluar.

**2FA**
- [ ] Masuk `totp@example.com` → diminta kode → kode salah ditolak → kode authenticator diterima.
- [ ] "Percayai perangkat ini" → masuk berikutnya di browser yang sama tanpa kode (30 hari).
- [ ] Kode cadangan → masuk; kode yang sama dipakai lagi → ditolak.
- [ ] Akun tanpa 2FA: Keamanan → Mulai aktivasi → QR + secret + kode cadangan → verifikasi → badge Aktif
      → Nonaktifkan dengan password.

**Catatan**
- [ ] Tambah (judul wajib, maks 200), tandai selesai (coret), hapus (toast). Data hanya milik akun sendiri.
- [ ] Judul kosong → pesan validasi, tidak ada request ke server.

**Admin & RBAC**
- [ ] Admin: menu Pengguna & Audit log tampil; tabel pengguna memuat semua akun dengan status.
- [ ] Audit log: filter "Gagal" hanya menampilkan entri gagal; "Muat lebih banyak" menambah baris.
- [ ] User biasa: menu admin tidak ada; `/admin/users` → halaman 403.
- [ ] Tanpa sesi: `GET /api/admin/users` → `401 { code: "UNAUTHORIZED" }`.

**Sistem**
- [ ] `/api/health/live` 200 tanpa DB; `/api/health/ready` 503 saat DB dimatikan.
- [ ] Rate limit: >100 request/menit ke `/api/hello` dari satu IP → `429 RATE_LIMITED` + `Retry-After`;
      sign-in >3 kali/10 detik → 429 (Better Auth).
- [ ] Route tidak dikenal → halaman 404; `/api/tidak-ada` → 404 JSON.

## 5. Selector stabil untuk test browser

Komponen memakai `data-testid` (bukan teks, yang bisa berubah/diterjemahkan). Di Playwright:
`page.getByTestId('auth-submit')`.

| Area | `data-testid` |
| --- | --- |
| Form masuk/daftar | `auth-name`, `auth-email`, `auth-password`, `auth-submit`, `auth-switch-mode`, `auth-error`, `auth-forgot-link`, `auth-resend-verification`, `auth-check-inbox` |
| Langkah 2FA | `totp-code`, `totp-submit`, `totp-toggle-backup`, `totp-trust-device`, `totp-error` |
| Lupa / reset password | `forgot-email`, `forgot-submit`, `forgot-sent`, `reset-new`, `reset-confirm`, `reset-submit` |
| Keamanan | `tf-status`, `tf-password`, `tf-submit`, `tf-secret`, `tf-backup-codes`, `tf-code`, `tf-confirm`, `cp-current`, `cp-new`, `cp-submit` |
| Header / menu | `login-link`, `main-nav`, `user-menu-trigger`, `user-menu-notes`, `user-menu-security`, `user-menu-api-token`, `user-menu-users`, `user-menu-audit`, `user-menu-sign-out` |
| Catatan | `note-title`, `note-content`, `note-submit`, `note-list`, `note-item` (+ `data-note-id`), `note-toggle`, `note-delete`, `notes-empty` |
| Admin | `users-table`, `user-row` (+ `data-email`), `audit-table`, `audit-row` (+ `data-action`), `audit-action`, `audit-success`, `audit-load-more`, `forbidden` |

Aturan: elemen yang berinteraksi dengan pengguna (input, tombol, baris data, state kosong/error)
diberi `data-testid` dengan prefix fitur; teks tetap boleh dipakai untuk memastikan isi.

## 6. Test otomatis (Playwright, `apps/e2e`)

```bash
bun run db:test:create                  # sekali: database test
bunx playwright install chromium        # sekali: browser
bun run e2e                             # nx: build web → start api (SERVE_WEB_DIST, migrasi, seed demo) → test
bun run e2e:ui                          # mode interaktif
```

- Server dijalankan Playwright (`webServer` di `apps/e2e/playwright.config.ts`) pada port `E2E_PORT`
  (default 3199) terhadap database test (`E2E_DATABASE_URL` → `TEST_DATABASE_URL` → `DATABASE_URL`+`_test`),
  memakai `BETTER_AUTH_SECRET` yang sama dengan `bun test` (kunci JWKS di DB dienkripsi dengan secret itu).
- Rate limit dimatikan di E2E (semua test dari satu IP); limiter diuji di `apps/api/tests`.
- Test berjalan berurutan (`workers: 1`) karena berbagi akun demo. Sign-up memakai email unik per run.
- Tambah skenario: file `apps/e2e/tests/*.spec.ts`, helper `login()`, `submitLogin()`, `totpCode()`
  di `tests/helpers.ts`. Laporan HTML: `bun run --cwd apps/e2e e2e:report`.

## 7. Melaporkan bug

Sertakan: URL, akun demo yang dipakai, langkah, hasil vs harapan, **`X-Request-Id`** dari
response (atau `requestId` di body error 500) agar baris log bisa dicari, dan entri
`/admin/audit-logs` bila terkait autentikasi.
