import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@hono-react-starter/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { paths } from '@/config/paths'
import { absoluteUrl, requestPasswordReset } from '@/lib/auth-client'

/**
 * Minta tautan reset password. Respons selalu sama (terdaftar atau tidak)
 * agar keberadaan akun tidak bocor.
 */
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } })
  const { errors, isSubmitting } = form.formState

  const submit = async (values: ForgotPasswordInput) => {
    setError(null)
    const res = await requestPasswordReset({ email: values.email, redirectTo: absoluteUrl(paths.resetPassword) })
    if (res.error) {
      setError(res.error.message ?? 'Gagal mengirim permintaan')
      return
    }
    setSentTo(values.email)
  }

  if (sentTo) {
    return (
      <Alert>
        <AlertTitle>Periksa email Anda</AlertTitle>
        <AlertDescription>
          Jika <strong>{sentTo}</strong> terdaftar, kami mengirim tautan untuk mengatur ulang password. Tautan berlaku 1
          jam.
        </AlertDescription>
        <Button variant="outline" size="sm" className="mt-2" render={<Link to={paths.login} />}>
          Kembali ke masuk
        </Button>
      </Alert>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
          <Input id="forgot-email" type="email" placeholder="budi@example.com" aria-invalid={Boolean(errors.email)} {...form.register('email')} />
          <FieldDescription>Kami akan mengirim tautan untuk mengatur ulang password.</FieldDescription>
          <FieldError errors={[errors.email]} />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            Kirim tautan
          </Button>
          <Button type="button" variant="outline" className="flex-1" render={<Link to={paths.login} />}>
            Batal
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
