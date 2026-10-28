import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { resetPasswordSchema, type ResetPasswordInput } from '@hono-react-starter/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { paths } from '@/config/paths'
import { resetPassword } from '@/lib/auth-client'

type Props = {
  /** Token dari query string tautan email (?token=…). */
  token: string | null
  /** Kode error dari server (?error=INVALID_TOKEN) bila tautan tidak valid. */
  errorCode?: string | null
  onSuccess?: () => void
}

/** Atur password baru dari tautan email reset. */
export function ResetPasswordForm({ token, errorCode, onSuccess }: Props) {
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })
  const { errors, isSubmitting } = form.formState

  if (!token || errorCode) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Tautan tidak valid</AlertTitle>
        <AlertDescription>
          {errorCode === 'INVALID_TOKEN' || !token
            ? 'Tautan reset password tidak valid atau sudah kedaluwarsa (berlaku 1 jam).'
            : `Terjadi kesalahan (${errorCode}).`}
        </AlertDescription>
        <Button variant="outline" size="sm" className="mt-2" render={<Link to={paths.forgotPassword} />}>
          Minta tautan baru
        </Button>
      </Alert>
    )
  }

  const submit = async (values: ResetPasswordInput) => {
    setError(null)
    const res = await resetPassword({ newPassword: values.newPassword, token })
    if (res.error) {
      setError(res.error.message ?? 'Gagal mengatur ulang password')
      return
    }
    toast.success('Password berhasil diubah. Silakan masuk.')
    onSuccess?.()
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reset-new">Password baru</FieldLabel>
          <Input id="reset-new" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.newPassword)} {...form.register('newPassword')} />
          <FieldError errors={[errors.newPassword]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="reset-confirm">Ulangi password baru</FieldLabel>
          <Input id="reset-confirm" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} {...form.register('confirmPassword')} />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
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
  )
}
