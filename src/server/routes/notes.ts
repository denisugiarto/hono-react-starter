import { Hono } from 'hono'
import { and, desc, eq } from 'drizzle-orm'
import { noteCreateSchema, noteUpdateSchema } from '../../shared/notes.ts'
import { requireAuth, type AuthEnv } from '../middleware/auth.ts'
import { db } from '../db/index.ts'
import { notes } from '../db/schema.ts'

export const notesRoutes = new Hono<AuthEnv>()

// Semua route notes wajib login; setiap query dibatasi ke pemilik (user_id).
notesRoutes.use('*', requireAuth)

function validationError(fieldErrors: Record<string, string[] | undefined>) {
  return {
    error: 'Data tidak valid',
    code: 'VALIDATION_ERROR',
    details: fieldErrors,
  }
}

const notFound = { error: 'Note tidak ditemukan', code: 'NOT_FOUND' }

// GET /api/notes — daftar catatan milik user (terbaru dulu)
notesRoutes.get('/', async (c) => {
  const userId = c.get('user').id
  const all = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.createdAt))
  return c.json(all)
})

// POST /api/notes — buat catatan baru (validasi via shared schema)
notesRoutes.post('/', async (c) => {
  const userId = c.get('user').id
  const body = await c.req.json().catch(() => null)
  const parsed = noteCreateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(validationError(parsed.error.flatten().fieldErrors), 400)
  }

  const [note] = await db
    .insert(notes)
    .values({
      userId,
      title: parsed.data.title,
      content: parsed.data.content,
    })
    .returning()

  return c.json(note, 201)
})

// PATCH /api/notes/:id — update sebagian field (hanya milik sendiri)
notesRoutes.patch('/:id', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  const parsed = noteUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(validationError(parsed.error.flatten().fieldErrors), 400)
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
  if (!note) return c.json(notFound, 404)
  return c.json(note)
})

// DELETE /api/notes/:id — hapus catatan (hanya milik sendiri)
notesRoutes.delete('/:id', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  const deleted = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning({ id: notes.id })
  if (deleted.length === 0) return c.json(notFound, 404)
  return c.json({ deleted: true })
})
