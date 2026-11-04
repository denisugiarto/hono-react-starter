## Apa yang berubah

<!-- Ringkas: fitur/perbaikan apa, di project mana (api/web/shared/e2e). -->

## Mengapa

<!-- Masalah atau kebutuhan yang diselesaikan; tautkan issue bila ada. -->

## Cara menguji

- [ ] `bunx nx run-many -t typecheck lint test build --skip-nx-cache` hijau
- [ ] `bun run e2e` hijau (bila menyentuh UI/alur pengguna)
- [ ] Skenario manual (lihat `docs/QA.md`): …

## Checklist

- [ ] Test ditambah/diperbarui (coverage 90 % per file)
- [ ] Migrasi baru bila schema berubah + daftar TRUNCATE di `apps/api/tests/setup.ts`
- [ ] Aksi mutasi/auth tercatat di audit log
- [ ] `data-testid` + `docs/QA.md` untuk elemen interaktif baru; story untuk komponen ber-state
- [ ] README / `.env.example` diperbarui bila perilaku, endpoint, atau env berubah
- [ ] Entri iterasi di `DEVELOPMENT_PROGRESS.md`

## Screenshot (UI)

<!-- Sebelum/sesudah, mode terang & gelap bila relevan. -->
