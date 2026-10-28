import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  noteSchema,
  type Note,
  type NoteCreateInput,
  type NoteUpdateInput,
} from '@hono-react-starter/shared'
import { request, requestEnvelope } from '@/lib/api/request'

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

type Snapshot = { previous?: Note[] }

/**
 * Optimistic update (pola TanStack Query):
 *   onMutate  → batalkan refetch yang sedang berjalan, simpan snapshot, ubah cache lokal
 *   onError   → kembalikan snapshot + toast
 *   onSettled → invalidate agar cache disamakan dengan server (sukses maupun gagal)
 * UI berubah seketika; server tetap sumber kebenaran.
 */
async function optimistic(qc: ReturnType<typeof useQueryClient>, update: (notes: Note[]) => Note[]): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: notesKeys.all })
  const previous = qc.getQueryData<Note[]>(notesKeys.all)
  if (previous) qc.setQueryData<Note[]>(notesKeys.all, update(previous))
  return { previous }
}

function rollback(qc: ReturnType<typeof useQueryClient>, snapshot: Snapshot | undefined, err: Error) {
  if (snapshot?.previous) qc.setQueryData(notesKeys.all, snapshot.previous)
  toast.error(err.message || 'Perubahan gagal disimpan')
}

/** Toggle selesai / belum (mutation, optimistic) */
export function useToggleNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      request<Note>(`/api/notes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ done } satisfies NoteUpdateInput),
      }),
    onMutate: ({ id, done }) => optimistic(qc, (notes) => notes.map((n) => (n.id === id ? { ...n, done } : n))),
    onError: (err, _vars, snapshot) => rollback(qc, snapshot, err),
    onSettled: () => qc.invalidateQueries({ queryKey: notesKeys.all }),
  })
}

/** Hapus note (mutation, optimistic) */
export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => request<{ id: string }>(`/api/notes/${id}`, { method: 'DELETE' }),
    onMutate: (id) => optimistic(qc, (notes) => notes.filter((n) => n.id !== id)),
    onError: (err, _id, snapshot) => rollback(qc, snapshot, err),
    onSettled: () => qc.invalidateQueries({ queryKey: notesKeys.all }),
  })
}
