import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { NoteForm, NoteList } from '@/features/notes'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function NotesPage() {
  useDocumentTitle('Catatan')
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Catatan" description="Per-user · TanStack Query · React Hook Form + Zod · tabel notes" />
      <Card>
        <CardContent>
          <NoteForm />
        </CardContent>
      </Card>
      <NoteList />
    </div>
  )
}
