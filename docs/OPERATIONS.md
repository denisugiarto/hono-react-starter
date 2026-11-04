# Operasional: backup, restore, migrasi, pemulihan

Berlaku untuk deployment Docker/compose maupun server biasa. Semua perintah memakai `DATABASE_URL`
yang sama dengan API.

## Backup database

```bash
# Dump terkompresi (format custom pg_dump, bisa restore selektif)
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl \
  --file "backup-$(date +%F-%H%M).dump"

# Di compose staging (service db)
docker compose -f docker-compose.staging.yml exec -T db \
  pg_dump -U postgres --format=custom hono_react_starter > backup.dump
```

Jadwalkan (cron/CI) minimal harian; simpan di penyimpanan terpisah (S3/GCS) dengan retensi ≥ 30 hari,
terenkripsi. Uji restore setiap kali mengubah schema besar (lihat di bawah).

Yang ada di DB dan tidak bisa dibuat ulang: `user`, `account` (hash password), `two_factor` (secret
terenkripsi dengan `BETTER_AUTH_SECRET`), `notes`, `audit_log`, `app_setting`, `app_role`. Yang aman
dibuang: `session`, `verification`, `rate_limit`, `api_rate_limit`, `sign_in_lockout`, `jwks` (dibuat ulang).

## Restore

```bash
createdb hono_react_starter_restore
pg_restore --dbname "postgresql://…/hono_react_starter_restore" --no-owner --no-acl --clean --if-exists backup.dump
# verifikasi: jumlah user, migrasi terakhir
psql "postgresql://…/hono_react_starter_restore" -c 'select count(*) from "user";' \
  -c 'select * from drizzle.__drizzle_migrations order by created_at desc limit 1;'
```

Lalu arahkan `DATABASE_URL` ke DB hasil restore dan restart API (`bun run start` menjalankan migrasi yang
belum ada). `BETTER_AUTH_SECRET` **harus sama** dengan saat backup agar secret 2FA bisa didekripsi; bila
berbeda, pengguna perlu mengaktifkan ulang 2FA.

## Migrasi

- Dijalankan otomatis saat `bun run start` (dan oleh `tests/setup.ts`). Untuk deploy tanpa downtime pada tabel
  besar ikuti pola expand → migrate → contract (skill `db-migrations`): tambah kolom nullable dulu, isi, baru
  pasang constraint di migrasi berikutnya.
- Rollback = restore backup atau migrasi balik yang ditulis manual; Drizzle tidak membuat `down`.
  Backup selalu **sebelum** deploy yang membawa migrasi.

## Pemulihan insiden

| Gejala | Tindakan |
| --- | --- |
| `GET /api/health/ready` 503 | DB tidak terjangkau: cek `DATABASE_URL`, pool, `sslmode`. Live tetap 200 agar container tidak restart loop |
| Semua request sesi 401 setelah deploy | `BETTER_AUTH_SECRET` berubah → sesi & jwks tidak valid. Kembalikan secret, atau `TRUNCATE session, jwks` dan minta pengguna masuk ulang |
| Banyak 429 dari satu IP padahal pengguna berbeda | `TRUST_PROXY` belum `true` di balik proxy (lihat peringatan boot) |
| Admin terkunci dari fitur | Role `admin` selalu penuh; set `role='admin'` langsung di DB untuk satu akun: `update "user" set role='admin' where email='…';` lalu cabut sesinya |
| Verifikasi email wajib tetapi email tidak terkirim | Matikan sementara di `/admin/settings` (atau `update app_setting set value='false' where key='requireEmailVerification';`), perbaiki `MAIL_PROVIDER` |
| Lupa password admin satu-satunya | Pakai "Lupa password" di UI (butuh email terkirim). Alternatif: `ADMIN_EMAIL=<email baru> ADMIN_PASSWORD=<kuat> bun run db:seed` membuat admin baru (bila email sudah ada, hanya role-nya dinaikkan — password tidak diganti) |

## Pemantauan minimum

- Log JSON (`LOG_FORMAT=json`) dikirim ke agregator; alarm pada `level=error` dan lonjakan status 5xx/429.
- Uptime check ke `/api/health/ready` dari luar.
- Audit: tinjau `admin.*` dan `auth.sign_in` gagal berulang di `/admin/audit-logs` atau query tabel `audit_log`.
- Tracing/metrics (OpenTelemetry, Sentry) belum terpasang — lihat Roadmap README.
