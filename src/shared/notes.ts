import { z } from 'zod'

/**
 * Schema & tipe untuk entity Notes.
 * Satu sumber kebenaran — dipakai server (validasi input)
 * dan client (tipe data & form).
 */

const titleSchema = z
  .string()
  .trim()
  .min(1, 'title wajib diisi')
  .max(200, 'title maksimal 200 karakter')
const contentSchema = z.string().max(10_000, 'content terlalu panjang')

/** Catatan lengkap seperti dikirim API (tanggal dalam ISO string) */
export const noteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  done: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Note = z.infer<typeof noteSchema>

/** Body untuk POST /api/notes */
export const noteCreateSchema = z.object({
  title: titleSchema,
  content: contentSchema.optional().default(''),
})
export type NoteCreateInput = z.infer<typeof noteCreateSchema>

/**
 * Body untuk PATCH /api/notes/:id — semua field opsional.
 * Didefinisikan eksplisit (bukan `noteCreateSchema.partial()`) karena
 * `.partial()` tetap menerapkan default `content: ''`, yang akan
 * menghapus isi catatan saat hanya mengubah `done`.
 */
export const noteUpdateSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
  done: z.boolean().optional(),
})
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>
