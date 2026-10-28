---
name: adding-feature
description: Use when adding a new domain/resource to this starter (table + /api route + React page), adding an endpoint to an existing resource, or wiring a new page into routes/navigation in apps/web.
---

# Menambah Fitur (fullstack)

Urutan **shared → tabel/migrasi → api → web → test → dokumen**. Satu sumber kebenaran: schema Zod di `packages/shared`.

## Langkah

1. **Shared** — `packages/shared/src/<fitur>.ts`: tipe + `xCreateSchema` / `xUpdateSchema` (Zod; update = field opsional eksplisit, bukan `.partial()` agar default tidak menimpa), ekspor di `src/index.ts`. Sub-path `@hono-react-starter/shared/<fitur>` otomatis ada (`exports: "./*"` di `package.json`) — tidak perlu diubah. Permission baru: tambah resource + daftar aksi di `statements` dan ke role yang berhak di `src/permissions.ts` (Better Auth access control **tidak punya wildcard**; tulis aksi satu per satu), lalu test `can('user', { x: [...] })` / `can('admin', …)` di `tests/shared.test.ts`. Test di `packages/shared/tests/shared.test.ts` — setiap callback (`.refine`, `.transform`) harus tereksekusi (coverage fungsi per file).
2. **Tabel** — `apps/api/src/db/schema.ts` lalu ikuti skill `db-migrations`.
3. **Route** — salin pola `apps/api/src/routes/notes.ts`: `new Hono<AppEnv>()`, `routes.use('*', requireAuth)`, per handler `requirePermission({ x: ['create'] })`. Validasi:
   ```ts
   const body = await c.req.json().catch(() => null) // arrow ini tercakup oleh test "body bukan JSON → 400"
   const parsed = xCreateSchema.safeParse(body)
   if (!parsed.success) return fail(c, 400, 'VALIDATION_ERROR', 'Data tidak valid', parsed.error.flatten().fieldErrors)
   ```
   Sukses `ok(c, data, { status: 201, message: '…' })`. Query selalu dibatasi `eq(table.userId, c.get('user').id)` → milik user lain = 404. Id path bukan UUID → 404 (`isUuid` lokal di `notes.ts`; route kedua → ekstrak ke `src/lib/uuid.ts`). Mount di `app.ts`: `app.route('/api/<fitur>', routes)` **sebelum** `app.all('/api/*', 404)`. Setiap cabang di route harus bisa dicapai test (coverage per file) — cabang yang tidak mungkin terjadi: hapus. Aksi yang mengubah data → skill `auditing-actions`.
4. **Web** — `apps/web/src/features/<fitur>/{api,components,index.ts}` (contoh `features/notes`): query memakai `request<unknown>(url)` lalu `schema.parse(...)`; mutation memakai `requestEnvelope` agar `res.message` dari server bisa jadi `toast.success`, lalu `invalidateQueries`. Halaman tipis di `pages/<fitur>-page.tsx` (`useDocumentTitle`, `PageHeader`). Daftarkan: `config/paths.ts` → `app/routes.tsx` (di bawah `RequireAuth` / `RequirePermission`) → `config/navigation.ts` (`NavItem` dengan `auth`, `permission`; disaring `useVisibleNav`) → tambah `DropdownMenuItem` di `features/auth/components/user-menu.tsx` bila halaman untuk pengguna login.
5. **Test** — api: `apps/api/tests/<fitur>.test.ts` (401, CRUD, isolasi antar user → 404 dengan dua `signUp()`, id bukan UUID, body bukan JSON / validasi 400, baris audit). Web: handler endpoint baru di `tests/mocks/api.ts`, `tests/features/<fitur>.test.tsx`, guard route di `tests/app/router.test.tsx`, item nav di `tests/app/layout.test.tsx`. Detail: skill `writing-tests`. Lalu skill `verifying-changes`.
6. **Dokumen** — README: tabel di bagian "API", tree di "Struktur", resource di "RBAC"; tambah entri iterasi di `DEVELOPMENT_PROGRESS.md`.

## Aturan yang sering terlewat

| Aturan | Alasan |
| --- | --- |
| Komponen hanya mengimpor fungsi bernama dari `@/lib/auth-client`, bukan `authClient.*` | Test me-mock modul itu per nama ekspor (`tests/mocks/auth-client.ts`) |
| Path tidak di-hardcode; pakai `paths.*` | Router, nav, redirect, dan test memakai sumber yang sama |
| Hindari impor antar `features/*` | Bila perlu, lewat `index.ts` fitur lain |
| `Button render={<Link/>}` → tetap link (role `link`) | Jangan set `nativeButton={false}`; itu mengubah role jadi `button` dan memecah test |
| Endpoint baru ikut rate limit `/api/*` kecuali ditambahkan ke `defaultRateLimitSkip` | Health & `/api/auth/*` sudah dilewati |
