import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { passwordConfirmSchema, totpCodeSchema } from '@hono-react-starter/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { twoFactor } from '@/lib/auth-client'
import { secretFromTotpUri } from '@/lib/format'
import { useAuth } from '../hooks/use-auth.ts'

type PasswordInput = { password: string }
type CodeInput = { code: string }
type Setup = { totpURI: string; backupCodes: string[] }

/**
 * Pengaturan 2FA (TOTP):
 * - belum aktif: password → QR + secret + backup code → kode 6 digit untuk mengaktifkan
 * - aktif: password → nonaktifkan
 * Sesi (useSession) otomatis di-refresh plugin client setelah aksi /two-factor/*.
 */
export function TwoFactorCard() {
  const { user } = useAuth()
  const enabled = Boolean(user?.twoFactorEnabled)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [error, setError] = useState<string | null>(null)

  const passwordForm = useForm<PasswordInput>({ resolver: zodResolver(passwordConfirmSchema), defaultValues: { password: '' } })
  const codeForm = useForm<CodeInput>({ resolver: zodResolver(totpCodeSchema), defaultValues: { code: '' } })

  const start = async ({ password }: PasswordInput) => {
    setError(null)
    const res = await twoFactor.enable({ password })
    if (res.error) {
      setError(res.error.message ?? 'Gagal memulai 2FA')
      return
    }
    passwordForm.reset()
    setSetup({ totpURI: res.data.totpURI, backupCodes: res.data.backupCodes })
  }

  const confirm = async ({ code }: CodeInput) => {
    setError(null)
    const res = await twoFactor.verifyTotp({ code })
    if (res.error) {
      setError(res.error.message ?? 'Kode tidak valid')
      return
    }
    codeForm.reset()
    setSetup(null)
    toast.success('Autentikasi dua faktor aktif')
  }

  const disable = async ({ password }: PasswordInput) => {
    setError(null)
    const res = await twoFactor.disable({ password })
    if (res.error) {
      setError(res.error.message ?? 'Gagal menonaktifkan 2FA')
      return
    }
    passwordForm.reset()
    toast.success('Autentikasi dua faktor dinonaktifkan')
  }

  const errorBlock = error && (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Autentikasi dua faktor (2FA)
          <Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? 'Aktif' : 'Nonaktif'}</Badge>
        </CardTitle>
        <CardDescription>
          Kode 6 digit dari aplikasi authenticator diminta setiap kali masuk. Simpan kode cadangan di tempat aman.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {setup ? (
          <form onSubmit={codeForm.handleSubmit(confirm)} noValidate className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="rounded-md border bg-white p-2 self-start" aria-label="QR code 2FA">
                <QRCodeSVG value={setup.totpURI} size={160} />
              </div>
              <div className="space-y-2 text-sm">
                <p>Pindai QR dengan aplikasi authenticator, atau masukkan secret ini secara manual:</p>
                <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{secretFromTotpUri(setup.totpURI)}</code>
                <p className="font-medium">Kode cadangan (sekali pakai):</p>
                <ul className="grid grid-cols-2 gap-1 font-mono text-xs" aria-label="Kode cadangan">
                  {setup.backupCodes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="tf-code">Kode dari aplikasi</FieldLabel>
                <Input id="tf-code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" aria-invalid={Boolean(codeForm.formState.errors.code)} {...codeForm.register('code')} />
                <FieldDescription>Masukkan kode untuk memastikan aplikasi sudah terpasang benar.</FieldDescription>
                <FieldError errors={[codeForm.formState.errors.code]} />
              </Field>
              {errorBlock}
              <div className="flex gap-2">
                <Button type="submit" disabled={codeForm.formState.isSubmitting}>
                  Aktifkan 2FA
                </Button>
                <Button type="button" variant="outline" onClick={() => setSetup(null)}>
                  Batal
                </Button>
              </div>
            </FieldGroup>
          </form>
        ) : (
          <form onSubmit={passwordForm.handleSubmit(enabled ? disable : start)} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="tf-password">Konfirmasi password</FieldLabel>
                <Input id="tf-password" type="password" autoComplete="current-password" aria-invalid={Boolean(passwordForm.formState.errors.password)} {...passwordForm.register('password')} />
                <FieldError errors={[passwordForm.formState.errors.password]} />
              </Field>
              {errorBlock}
              <Button type="submit" variant={enabled ? 'destructive' : 'default'} disabled={passwordForm.formState.isSubmitting}>
                {enabled ? 'Nonaktifkan 2FA' : 'Mulai aktivasi 2FA'}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
