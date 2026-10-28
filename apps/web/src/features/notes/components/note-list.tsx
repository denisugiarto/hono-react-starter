import { Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { Note } from '@hono-react-starter/shared'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorMessage } from '@/components/common/error-message'
import { LoadingState } from '@/components/common/loading-state'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useDeleteNote, useNotes, useToggleNote } from '../api/notes.ts'

type ItemProps = { note: Note; onToggle: (note: Note) => void; onDelete: (note: Note) => void; busy: boolean }

export function NoteItem({ note, onToggle, onDelete, busy }: ItemProps) {
  return (
    <li data-testid="note-item" data-note-id={note.id} className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
      <Checkbox
        data-testid="note-toggle"
        checked={note.done}
        onCheckedChange={() => onToggle(note)}
        aria-label={`Tandai "${note.title}" selesai`}
      />
      <div className="min-w-0 flex-1">
        <p className={cn(note.done ? 'text-muted-foreground line-through' : 'font-medium')}>{note.title}</p>
        {note.content && <p className="truncate text-sm text-muted-foreground">{note.content}</p>}
      </div>
      <Button
        data-testid="note-delete"
        variant="ghost"
        size="icon-sm"
        disabled={busy}
        onClick={() => onDelete(note)}
        aria-label={`Hapus "${note.title}"`}
      >
        <Trash2Icon />
      </Button>
    </li>
  )
}

/** Daftar catatan pengguna: loading → error → kosong → item. */
export function NoteList() {
  const notes = useNotes()
  const toggle = useToggleNote()
  const remove = useDeleteNote()

  if (notes.isPending) return <LoadingState rows={2} label="Memuat catatan…" />
  if (notes.isError) return <ErrorMessage error={notes.error} />
  if (notes.data.length === 0) {
    return <EmptyState data-testid="notes-empty" title="Belum ada catatan" description="Tambahkan satu lewat form di atas." />
  }

  return (
    <ul data-testid="note-list" className="space-y-2">
      {notes.data.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          busy={remove.isPending}
          onToggle={(n) => toggle.mutate({ id: n.id, done: !n.done })}
          onDelete={(n) => remove.mutate(n.id, { onSuccess: () => toast.success('Catatan dihapus') })}
        />
      ))}
    </ul>
  )
}
