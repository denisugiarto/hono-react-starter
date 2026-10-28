import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { z } from 'zod'
import { noteCreateSchema, type NoteCreateInput } from '@hono-react-starter/shared'
import { ErrorMessage } from '@/components/common/error-message'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateNote } from '../api/notes.ts'

/** Form tambah catatan (React Hook Form + Zod schema shared + mutation). */
export function NoteForm() {
  const createNote = useCreateNote()
  // useForm 3 param: input (field form) → output (hasil parse zod; content selalu string).
  const form = useForm<z.input<typeof noteCreateSchema>, unknown, z.output<typeof noteCreateSchema>>({
    resolver: zodResolver(noteCreateSchema),
    defaultValues: { title: '', content: '' },
  })
  const { errors, isSubmitting } = form.formState

  const submit = (values: NoteCreateInput) =>
    createNote.mutate(values, {
      onSuccess: (res) => {
        form.reset()
        toast.success(res.message ?? 'Catatan dibuat')
      },
    })

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor="note-title">Judul</FieldLabel>
          <Input
            id="note-title"
            placeholder="Mis. Belajar Drizzle"
            aria-invalid={Boolean(errors.title)}
            {...form.register('title')}
          />
          <FieldError errors={[errors.title]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="note-content">Isi (opsional)</FieldLabel>
          <Textarea id="note-content" placeholder="Catatan singkat…" {...form.register('content')} />
        </Field>
      </FieldGroup>
      {createNote.isError && <ErrorMessage error={createNote.error} />}
      <Button type="submit" disabled={createNote.isPending || isSubmitting}>
        Tambah
      </Button>
    </form>
  )
}
