---
name: auditing-actions
description: Use when a new route mutates data, when a new Better Auth endpoint/plugin should appear in audit_log, or when asked who-did-what tracing, compliance, or audit log questions for this starter.
---

# Audit Log

Tabel `audit_log` append-only (`apps/api/src/db/schema.ts`), ditulis lewat `apps/api/src/lib/audit.ts`. Kegagalan tulis = fail-open (dicatat `error`), bukan gagal request.

## Aksi data (route Hono)

```ts
import { auditFromContext } from '../lib/audit.ts'
// SETELAH mutasi terbukti berhasil (bukan di cabang 404/400), SEBELUM return ok(...)
await auditFromContext(c, { action: 'project.created', targetType: 'project', targetId: row.id })
// update: sertakan field yang diubah, bukan nilainya
await auditFromContext(c, { action: 'project.updated', targetType: 'project', targetId: id, metadata: { fields: Object.keys(parsed.data) } })
```

Route data hanya mengaudit aksi yang **berhasil**; percobaan gagal (401/403/404/400) tidak dicatat di sini — kegagalan auth sudah dicatat pembungkus `withAuthAudit`, dan 4xx lain ada di log request.

1. Tambah nama aksi ke `AUDIT_ACTIONS` di `packages/shared/src/audit.ts` (format `<domain>.<peristiwa>`, snake_case) — tipe `AuditAction` menolak string lain.
2. Pelaku, `requestId`, IP, UA diisi otomatis dari `c.get('user')` dan request. Jangan taruh rahasia/password di `metadata`.
3. Test: query `db.select().from(auditLog).where(eq(auditLog.actorId, u.user.id))` setelah memanggil endpoint (contoh `tests/audit.test.ts`).

## Aksi auth (/api/auth/*)

Diaudit oleh pembungkus `withAuthAudit` di `apps/api/src/auth-audit.ts` — bukan hook Better Auth, karena hook `after` tidak berjalan saat endpoint melempar error, dan sesi harus dibaca **sebelum** aksi (sign-out).

Endpoint baru (plugin/OAuth): tambah entri ke `RULES`: path relatif `/api/auth`, `action` (daftarkan di `AUDIT_ACTIONS`), `actor`: `session` (pelaku sudah login) | `response` (sesi baru, baca `user` dari body respons) | `either` | `none`; `targetUser: true` bila `body.userId` adalah user lain; `meta` = field body non-rahasia yang disalin.

## Kode tanpa Context Hono

`currentRequest()` dari `lib/request-context.ts` (AsyncLocalStorage diisi `requestLog`) memberi `requestId/ip/userAgent/log`; `recordAudit(entry)` memakainya otomatis.

## Membaca

`GET /api/admin/audit-logs?action=<prefix>&actorId=&success=&limit=&cursor=` (permission `audit:list`, cursor = `nextCursor`). UI: `/admin/audit-logs`.
