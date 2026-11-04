# Kebijakan Keamanan

## Melaporkan kerentanan

Jangan membuka issue publik untuk kerentanan. Kirim laporan lewat
[GitHub Security Advisories](https://github.com/denisugiarto/hono-react-starter/security/advisories/new)
(private). Sertakan versi/commit, langkah reproduksi, dan dampaknya.

Target respons: konfirmasi penerimaan dalam 3 hari kerja, penilaian awal dalam 7 hari. Perbaikan
dirilis sebagai commit di `main` dan dicatat di `DEVELOPMENT_PROGRESS.md`; pelapor disebut bila bersedia.

## Versi yang didukung

Hanya `main` terbaru. Starter ini tidak memakai rilis bernomor; perbarui dengan `git pull` dan jalankan
`bun install && bun run db:migrate`.

## Pengerasan yang sudah ada

Ringkasan ada di README bagian **Security & Hardening** (hasil review OWASP Top 10). Intinya: rate limit
per IP + lockout akun, anti-enumerasi, 2FA TOTP, password bocor ditolak (HIBP), CSP & header keamanan,
CORS hanya origin tepercaya, TLS database wajib di production, audit log append-only, dependensi diaudit di CI.

## Konfigurasi yang WAJIB diperiksa sebelum production

| Env | Nilai aman |
| --- | --- |
| `NODE_ENV` | `production` |
| `BETTER_AUTH_SECRET` | ≥ 32 karakter acak (`openssl rand -base64 32`), berbeda per lingkungan |
| `BETTER_AUTH_URL` | `https://…` (cookie Secure, HSTS) |
| `DATABASE_URL` | `?sslmode=require` (atau `DATABASE_SSL_REQUIRED=false` hanya di jaringan privat) |
| `TRUST_PROXY` | `true` bila di balik reverse proxy/load balancer |
| `TRUSTED_ORIGINS` | Hanya origin frontend bila di-host terpisah |
| `MAIL_PROVIDER` | `resend` + `RESEND_API_KEY`, lalu nyalakan "wajib verifikasi email" di `/admin/settings` |
| `API_DOCS_ENABLED` | `false` (default production) kecuali staging |
| `DEMO_SEED_ALLOWED` | Jangan diaktifkan di production (akun demo berpassword publik) |

Endpoint contoh `GET /api/hello` dan `POST /api/echo` (`apps/api/src/routes/api.ts`) boleh dihapus bila tidak dipakai.

## Rotasi rahasia

- `BETTER_AUTH_SECRET` baru → semua sesi, cookie cache, dan secret 2FA terenkripsi menjadi tidak valid;
  jalankan `TRUNCATE session, jwks` dan minta pengguna masuk ulang (2FA perlu diaktifkan ulang).
- `RESEND_API_KEY`, `REDIS_URL`, kredensial DB: ganti di secret manager lalu restart; tidak ada state yang bergantung.
