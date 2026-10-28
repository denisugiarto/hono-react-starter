import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  noteSchema,
  type Note,
  type NoteCreateInput,
  type NoteUpdateInput,
} from '@hono-react-starter/shared'
import { request, requestEnvelope } from './request.ts'

export const notesKeys = {
  all: ['notes'] as const,
}

/**
 * Daftar notes milik user yang login.
 * `enabled` dikontrol dari luar — endpoint butuh sesi (401 bila belum login).
 */
export function useNotes(enabled = true) {
  return useQuery({
    queryKey: notesKeys.all,
    enabled,
    queryFn: async () => {
      const data = await request<unknown>('/api/notes')
      return noteSchema.array().parse(data)
    },
  })
}

/**
 * Buat note (mutation). Mengembalikan envelope utuh agar UI bisa menampilkan
 * `message` dari server ("Catatan dibuat").
 */
export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NoteCreateInput) =>
      requestEnvelope<Note>('/api/notes', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKeys.all }),
  })
}

/** Toggle selesai / belum (mutation) */
export function useToggleNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      request<Note>(`/api/notes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ done } satisfies NoteUpdateInput),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKeys.all }),
  })
}

/** Hapus note (mutation) */
export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => request<{ id: string }>(`/api/notes/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKeys.all }),
  })
}
