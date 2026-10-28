import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { signInSchema, signUpSchema, type SignUpInput } from '@hono-react-starter/shared'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { signIn, signUp } from '@/lib/auth-client'

export type AuthMode = 'signin' | 'signup'

type Props = { defaultMode?: AuthMode; onSuccess?: () => void }

/**
 * Form masuk / daftar (React Hook Form + Zod + Better Auth).
 * Satu form untuk dua mode: field `name` hanya tampil & divalidasi saat daftar.
 */
export function AuthForm({ defaultMode = 'signin', onSuccess }: Props) {
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [error, setError] = useState<string | null>(null)
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
    form.clearErrors()
  }

  const submit = async (values: SignUpInput) => {
    setError(null)
    const res =
      mode === 'signup'
        ? await signUp.email({ email: values.email, password: values.password, name: values.name })
        : await signIn.email({ email: values.email, password: values.password })
    if (res.error) {
      setError(res.error.message ?? 'Gagal autentikasi')
      return
    }
    form.reset()
    await queryClient.invalidateQueries()
    toast.success(mode === 'signup' ? 'Akun berhasil dibuat' : 'Selamat datang kembali')
    onSuccess?.()
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        {mode === 'signup' && (
          <Field>
            <FieldLabel htmlFor="auth-name">Nama</FieldLabel>
            <Input id="auth-name" placeholder="Budi" aria-invalid={Boolean(errors.name)} {...form.register('name')} />
            <FieldError errors={[errors.name]} />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="auth-email">Email</FieldLabel>
          <Input
            id="auth-email"
            type="email"
            placeholder="budi@example.com"
            aria-invalid={Boolean(errors.email)}
            {...form.register('email')}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="auth-password">Password</FieldLabel>
          <Input
            id="auth-password"
            type="password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password)}
            {...form.register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {mode === 'signin' ? 'Masuk' : 'Daftar'}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={switchMode}>
            {mode === 'signin' ? 'Daftar akun baru' : 'Sudah punya akun'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
