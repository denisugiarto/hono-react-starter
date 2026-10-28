---
name: db-migrations
description: Use when changing Drizzle schema in apps/api/src/db (new table/column/index), adding a Better Auth plugin that needs tables, or when tests fail with "relation does not exist" / stale TRUNCATE list.
---

# Migrasi Database (Drizzle + Better Auth)

Migrasi **versioned** di `apps/api/drizzle/`, dijalankan otomatis saat `bun run start` dan oleh `tests/setup.ts`.

## Langkah

1. Ubah schema: tabel aplikasi di `apps/api/src/db/schema.ts`; tabel/kolom milik plugin Better Auth di `apps/api/src/db/auth-schema.ts` (ditulis tangan mengikuti `schema.mjs` plugin — object key = nama model, mis. `twoFactor` → tabel `two_factor`). Kolom waktu aplikasi: `timestamp(..., { withTimezone: true })`.
2. Generate: `cd apps/api && bunx drizzle-kit generate --name <deskripsi_snake>` (tanpa koneksi DB) → cek SQL di `drizzle/00NN_<nama>.sql`. Commit SQL **dan** `drizzle/meta/` (snapshot + `_journal.json`). Nama migrasi lama acak; yang baru selalu diberi `--name`.
3. **Wajib**: tambahkan nama tabel (dengan tanda kutip) ke satu baris `TRUNCATE TABLE "notes", "audit_log", …` di `apps/api/tests/setup.ts` — kalau tidak, data test bocor antar run.
4. Terapkan ke DB dev: `bun run db:migrate` (memakai `DATABASE_URL`). DB test dimigrasi otomatis oleh `tests/setup.ts` saat `bun test`. Jangan pakai `db:push` untuk perubahan yang akan di-commit.
5. Tabel append-only (audit) → tanpa FK ke `user`; tabel milik user → `references(() => user.id, { onDelete: 'cascade' })` + index `user_id`.

## Gotcha

- Mengubah primary key lewat drizzle-kit menghasilkan SQL salah (`multiple primary keys`) → edit SQL manual.
- `drizzle.config.ts` membaca `DATABASE_URL` hanya untuk `push/studio`; `generate` tidak butuh DB.
- `src/db/schema.ts` dan `auth-schema.ts` dikecualikan dari coverage (`bunfig.toml`), jadi deklarasi tidak perlu test; **logika** jangan ditaruh di sana.
- Better Auth CLI (`bunx better-auth generate`) memformat ulang seluruh `auth-schema.ts`; lebih aman menambah tabel plugin secara manual lalu bandingkan dengan `node_modules/better-auth/dist/plugins/<plugin>/schema.mjs`.
