# Berkontribusi

Terima kasih! Alur singkatnya: fork/branch → ubah + test → `bun run check` → PR ke `main`.

## Persiapan

```bash
bun install
cp apps/api/.env.example apps/api/.env      # isi BETTER_AUTH_SECRET
createdb hono_react_starter && bun run db:migrate && bun run db:seed
bun run db:test:create                       # DB test (sekali)
bun run dev                                  # web :5173, api :3000
```

Dokumen yang perlu dibaca: `README.md` (arsitektur), `AGENTS.md` (aturan keras — berlaku untuk manusia
juga), `docs/QA.md` (skenario uji), skill di `.claude/skills/*/SKILL.md` (langkah per jenis tugas).

## Aturan perubahan

- **Setiap perubahan perilaku disertai test**; coverage 90 % baris & fungsi berlaku per file (`bun test`).
- Schema DB → migrasi baru (`bun run db:generate`), jangan mengubah SQL lama; tabel baru masuk daftar
  TRUNCATE di `apps/api/tests/setup.ts`.
- Respons API lewat `ok()`/`fail()`; kode error di `packages/shared/src/api.ts`; aksi mutasi dicatat audit.
- UI: komponen di `components/common` dulu, `data-testid` berprefix fitur, story untuk komponen ber-state.
- Dokumen: README bila perilaku/endpoint/env berubah, `docs/QA.md` untuk selector, satu entri iterasi di
  `DEVELOPMENT_PROGRESS.md`.

## Sebelum membuka PR

```bash
bunx nx run-many -t typecheck lint test build --skip-nx-cache   # persis CI
bun run e2e                                                      # Playwright
bun scripts/audit.ts                                             # audit dependensi
```

CI juga membangun Storybook dan image Docker. PR digabung bila semua job hijau dan ada review dari
CODEOWNERS.

## Commit & PR

- Conventional Commits berbahasa Indonesia, scope = project: `feat(api): …`, `fix(web): …`, `docs: …`,
  `chore(skills): …`.
- Satu PR = satu tujuan. Isi template PR (apa, mengapa, cara menguji, screenshot untuk UI).
- Dependensi: ubah rentang di `package.json` project lalu `bun install`; paket transitif lewat `overrides` root.

## Melaporkan bug & kerentanan

Bug lewat issue (template tersedia). Kerentanan keamanan **tidak** lewat issue — lihat `SECURITY.md`.
