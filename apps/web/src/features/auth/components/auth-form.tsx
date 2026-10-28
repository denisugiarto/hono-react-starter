import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { signInSchema, signUpSchema, type SignUpInput } from '@hono-react-starter/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { paths } from '@/config/paths'
import { absoluteUrl, sendVerificationEmail, signIn, signUp } from '@/lib/auth-client'

export type AuthMode = 'signin' | 'signup'

type Props = {
  defaultMode?: AuthMode
  /** Sesi terbentuk (masuk / daftar tanpa wajib verifikasi). */
  onSuccess?: () => void
  /** Akun ber-2FA: lanjut ke langkah kode TOTP (lihat TwoFactorForm). */
  onTwoFactor?: () => void
}

/**
 * Form masuk / daftar (React Hook Form + Zod + Better Auth).
 * Satu form untuk dua mode: field `name` hanya tampil & divalidasi saat daftar.
 * Menangani: 2FA (twoFactorRedirect), email belum diverifikasi (403
 * EMAIL_NOT_VERIFIED + kirim ulang), dan daftar yang butuh verifikasi dulu.
 */
export function AuthForm({ defaultMode = 'signin', onSuccess, onTwoFactor }: Props) {
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [error, setError] = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [checkInbox, setCheckInbox] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const schema = mode === 'signin' ? signInSchema : signUpSchema
  // Cast resolver karena schema berubah mengikuti mode (field form tetap sama).
  const form = useForm<SignUpInput>({
    resolver: zodResolver(schema) as unknown as Resolver<SignUpInput>,
    defaultValues: { name: '', email: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError(null)
    setUnverifiedEmail(null)
    setCheckInbox(null)
    form.clearErrors()
  }

  const resend = async () => {
    if (!unverifiedEmail) return
    const res = await sendVerificationEmail({ email: unverifiedEmail, callbackURL: absoluteUrl(paths.verifyEmail) })
    if (res.error) toast.error(res.error.message ?? 'Gagal mengirim email')
    else toast.success('Email verifikasi dikirim ulang')
  }

  const submit = async (values: SignUpInput) => {
    setError(null)
    setUnverifiedEmail(null)
    // callbackURL hanya untuk daftar (tujuan tautan verifikasi). JANGAN dikirim saat
    // masuk: Better Auth membalas `{ redirect: true, url }` dan client akan
    // memindahkan browser ke URL itu, bukan ke halaman tujuan.
    const res =
      mode === 'signup'
        ? await signUp.email({
            email: values.email,
            password: values.password,
            name: values.name,
            callbackURL: absoluteUrl(paths.verifyEmail),
          })
        : await signIn.email({ email: values.email, password: values.password })
    if (res.error) {
      if (res.error.code === 'EMAIL_NOT_VERIFIED') setUnverifiedEmail(values.email)
      setError(res.error.message ?? 'Gagal autentikasi')
      return
    }
    const data = res.data as { token?: string | null; twoFactorRedirect?: boolean } | null
    if (data?.twoFactorRedirect) {
      onTwoFactor?.()
      return
    }
    if (mode === 'signup' && data && data.token === null) {
      // Server mewajibkan verifikasi email sebelum sesi dibuat
      setCheckInbox(values.email)
      form.reset()
      return
    }
    form.reset()
    await queryClient.invalidateQueries()
    toast.success(mode === 'signup' ? 'Akun berhasil dibuat' : 'Selamat datang kembali')
    onSuccess?.()
  }

  if (checkInbox) {
    return (
      <Alert data-testid="auth-check-inbox">
        <AlertTitle>Periksa email Anda</AlertTitle>
        <AlertDescription>
          Kami mengirim tautan verifikasi ke <strong>{checkInbox}</strong>. Buka tautan itu untuk mengaktifkan akun, lalu
          masuk.
        </AlertDescription>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={switchMode}>
          Ke halaman masuk
        </Button>
      </Alert>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        {mode === 'signup' && (
          <Field>
            <FieldLabel htmlFor="auth-name">Nama</FieldLabel>
            <Input id="auth-name" data-testid="auth-name" placeholder="Budi" aria-invalid={Boolean(errors.name)} {...form.register('name')} />
            <FieldError errors={[errors.name]} />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="auth-email">Email</FieldLabel>
          <Input
            id="auth-email"
            data-testid="auth-email"
            type="email"
            placeholder="budi@example.com"
            aria-invalid={Boolean(errors.email)}
            {...form.register('email')}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="auth-password">Password</FieldLabel>
            {mode === 'signin' && (
              <Link to={paths.forgotPassword} data-testid="auth-forgot-link" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                Lupa password?
              </Link>
            )}
          </div>
          <Input
            id="auth-password"
            data-testid="auth-password"
            type="password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password)}
            {...form.register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        {error && (
          <div role="alert" data-testid="auth-error" className="space-y-2 text-sm text-destructive">
            <p>{error}</p>
            {unverifiedEmail && (
              <Button type="button" variant="outline" size="sm" data-testid="auth-resend-verification" onClick={resend}>
                Kirim ulang email verifikasi
              </Button>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" data-testid="auth-submit" disabled={isSubmitting}>
            {mode === 'signin' ? 'Masuk' : 'Daftar'}
          </Button>
          <Button type="button" variant="outline" className="flex-1" data-testid="auth-switch-mode" onClick={switchMode}>
            {mode === 'signin' ? 'Daftar akun baru' : 'Sudah punya akun'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
