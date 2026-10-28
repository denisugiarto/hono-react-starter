import { Hono } from 'hono'
import { and, desc, eq } from 'drizzle-orm'
import { noteCreateSchema, noteUpdateSchema } from '@hono-react-starter/shared/notes'
import { requireAuth, requirePermission } from '../middleware/auth.ts'
import type { AppEnv } from '../types.ts'
import { db } from '../db/index.ts'
import { notes } from '../db/schema.ts'
import { auditFromContext } from '../lib/audit.ts'
import { fail, ok } from '../lib/response.ts'

export const notesRoutes = new Hono<AppEnv>()

// Semua route notes wajib terautentikasi (sesi cookie atau JWT bearer);
// permission dicek per aksi dan setiap query dibatasi ke pemilik (user_id).
notesRoutes.use('*', requireAuth)

// id harus UUID — selain itu Postgres akan melempar error (→ 500). Perlakukan
// id yang tidak valid sebagai "tidak ditemukan".
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (value: string) => UUID_RE.test(value)

const NOT_FOUND = 'Note tidak ditemukan'

// GET /api/notes — daftar catatan milik user (terbaru dulu)
notesRoutes.get('/', requirePermission({ note: ['read'] }), async (c) => {
  const userId = c.get('user').id
  const all = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.createdAt))
  return ok(c, all)
})

// POST /api/notes — buat catatan baru (validasi via shared schema)
notesRoutes.post('/', requirePermission({ note: ['create'] }), async (c) => {
  const userId = c.get('user').id
  const body = await c.req.json().catch(() => null)
  const parsed = noteCreateSchema.safeParse(body)
  if (!parsed.success) {
    return fail(c, 400, 'VALIDATION_ERROR', 'Data tidak valid', parsed.error.flatten().fieldErrors)
  }

  const [note] = await db
    .insert(notes)
    .values({ userId, title: parsed.data.title, content: parsed.data.content })
    .returning()

  c.get('log').info('note created', { noteId: note!.id })
  await auditFromContext(c, { action: 'note.created', targetType: 'note', targetId: note!.id })
  return ok(c, note, { status: 201, message: 'Catatan dibuat' })
})

// PATCH /api/notes/:id — update sebagian field (hanya milik sendiri)
notesRoutes.patch('/:id', requirePermission({ note: ['update'] }), async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  if (!isUuid(id)) return fail(c, 404, 'NOT_FOUND', NOT_FOUND)
  const body = await c.req.json().catch(() => null)
  const parsed = noteUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return fail(c, 400, 'VALIDATION_ERROR', 'Data tidak valid', parsed.error.flatten().fieldErrors)
  }

  const set: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() }
  if (parsed.data.title !== undefined) set.title = parsed.data.title
  if (parsed.data.content !== undefined) set.content = parsed.data.content
  if (parsed.data.done !== undefined) set.done = parsed.data.done

  const [note] = await db
    .update(notes)
    .set(set)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning()
  if (!note) return fail(c, 404, 'NOT_FOUND', NOT_FOUND)
  await auditFromContext(c, {
    action: 'note.updated',
    targetType: 'note',
    targetId: id,
    metadata: { fields: Object.keys(parsed.data) },
  })
  return ok(c, note, { message: 'Catatan diperbarui' })
})

// DELETE /api/notes/:id — hapus catatan (hanya milik sendiri)
notesRoutes.delete('/:id', requirePermission({ note: ['delete'] }), async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  if (!isUuid(id)) return fail(c, 404, 'NOT_FOUND', NOT_FOUND)
  const deleted = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning({ id: notes.id })
  if (deleted.length === 0) return fail(c, 404, 'NOT_FOUND', NOT_FOUND)
  c.get('log').info('note deleted', { noteId: id })
  await auditFromContext(c, { action: 'note.deleted', targetType: 'note', targetId: id })
  return ok(c, { id }, { message: 'Catatan dihapus' })
})
