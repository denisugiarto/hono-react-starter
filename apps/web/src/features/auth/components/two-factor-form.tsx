import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { backupCodeSchema, totpCodeSchema } from '@hono-react-starter/shared'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { twoFactor } from '@/lib/auth-client'

type Props = { onSuccess?: () => void }
type CodeInput = { code: string }

/**
 * Langkah kedua login: kode 6 digit dari aplikasi authenticator, atau kode
 * cadangan (sekali pakai). "Percayai perangkat ini" melewati 2FA 30 hari.
 */
export function TwoFactorForm({ onSuccess }: Props) {
  const [useBackup, setUseBackup] = useState(false)
  const [trustDevice, setTrustDevice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const form = useForm<CodeInput>({
    resolver: zodResolver(useBackup ? backupCodeSchema : totpCodeSchema),
    defaultValues: { code: '' },
  })
  const { errors, isSubmitting } = form.formState

  const toggleBackup = () => {
    setUseBackup((v) => !v)
    setError(null)
    form.reset()
  }

  const submit = async ({ code }: CodeInput) => {
    setError(null)
    const res = useBackup ? await twoFactor.verifyBackupCode({ code, trustDevice }) : await twoFactor.verifyTotp({ code, trustDevice })
    if (res.error) {
      setError(res.error.message ?? 'Kode tidak valid')
      return
    }
    await queryClient.invalidateQueries()
    toast.success('Selamat datang kembali')
    onSuccess?.()
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="totp-code">{useBackup ? 'Kode cadangan' : 'Kode authenticator'}</FieldLabel>
          <Input
            id="totp-code"
            inputMode={useBackup ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            placeholder={useBackup ? 'xxxxx-xxxxx' : '123456'}
            aria-invalid={Boolean(errors.code)}
            {...form.register('code')}
          />
          <FieldDescription>
            {useBackup
              ? 'Masukkan salah satu kode cadangan yang Anda simpan saat mengaktifkan 2FA.'
              : 'Buka aplikasi authenticator (Google Authenticator, 1Password, …) dan masukkan kode 6 digit.'}
          </FieldDescription>
          <FieldError errors={[errors.code]} />
        </Field>
        <Field orientation="horizontal">
          <Switch id="trust-device" checked={trustDevice} onCheckedChange={setTrustDevice} />
          <FieldLabel htmlFor="trust-device">Percayai perangkat ini selama 30 hari</FieldLabel>
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            Verifikasi
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={toggleBackup}>
            {useBackup ? 'Pakai kode authenticator' : 'Pakai kode cadangan'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
