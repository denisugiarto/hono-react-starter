import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { changePasswordSchema, type ChangePasswordInput } from '@hono-react-starter/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { changePassword } from '@/lib/auth-client'

/** Ganti password (butuh password saat ini); opsional cabut sesi di perangkat lain. */
export function ChangePasswordCard() {
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', revokeOtherSessions: true },
  })
  const { errors, isSubmitting } = form.formState
  const revoke = form.watch('revokeOtherSessions')

  const submit = async (values: ChangePasswordInput) => {
    setError(null)
    const res = await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: values.revokeOtherSessions ?? true,
    })
    if (res.error) {
      setError(res.error.message ?? 'Gagal mengganti password')
      return
    }
    form.reset()
    toast.success('Password berhasil diganti')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ganti password</CardTitle>
        <CardDescription>Minimal 8 karakter. Sesi di perangkat lain bisa dicabut sekaligus.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cp-current">Password saat ini</FieldLabel>
              <Input id="cp-current" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.currentPassword)} {...form.register('currentPassword')} />
              <FieldError errors={[errors.currentPassword]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cp-new">Password baru</FieldLabel>
              <Input id="cp-new" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.newPassword)} {...form.register('newPassword')} />
              <FieldError errors={[errors.newPassword]} />
            </Field>
            <Field orientation="horizontal">
              <Switch id="cp-revoke" checked={revoke ?? true} onCheckedChange={(v) => form.setValue('revokeOtherSessions', v)} />
              <FieldLabel htmlFor="cp-revoke">Keluar dari perangkat lain</FieldLabel>
            </Field>
            <FieldDescription>Setelah diganti, Anda tetap masuk di perangkat ini.</FieldDescription>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              Simpan password
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
