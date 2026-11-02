import type { AppSettingsView } from '@hono-react-starter/shared'
import { ErrorMessage } from '@/components/common/error-message'
import { LoadingState } from '@/components/common/loading-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { formatRelative } from '@/lib/datetime'
import { useAppSettings, useUpdateAppSettings } from '../api/settings.ts'

export type AppSettingsCardProps = {
  settings: AppSettingsView
  /** Sedang menyimpan → saklar dinonaktifkan sementara. */
  saving?: boolean
  onChange: (patch: { requireEmailVerification: boolean }) => void
}

/**
 * Kartu pengaturan runtime (presentasional). Saklar "wajib verifikasi email"
 * dinonaktifkan bila infra belum siap (production tanpa provider email sungguhan).
 */
export function AppSettingsCard({ settings, saving = false, onChange }: AppSettingsCardProps) {
  const ready = settings.emailVerificationReady
  const disabled = saving || (!ready && !settings.requireEmailVerification)
  return (
    <Card data-testid="app-settings-card">
      <CardHeader>
        <CardTitle>Autentikasi</CardTitle>
        <CardDescription>Berlaku seketika untuk semua pengguna tanpa deploy ulang; perubahan dicatat di audit log.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field orientation="horizontal">
          <div className="flex flex-1 flex-col gap-1">
            <FieldLabel htmlFor="settings-require-email-verification">Wajibkan verifikasi email</FieldLabel>
            <FieldDescription>
              Akun yang belum memverifikasi email ditolak saat masuk (403 EMAIL_NOT_VERIFIED) dan email verifikasi dikirim ulang.
            </FieldDescription>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Provider email:</span>
              <Badge variant="outline" data-testid="settings-mail-provider">
                {settings.mailProvider}
              </Badge>
              {ready ? (
                <Badge variant="secondary">siap</Badge>
              ) : (
                <span data-testid="settings-not-ready" className="text-warning">
                  Belum siap: di production butuh MAIL_PROVIDER=resend agar email benar-benar terkirim.
                </span>
              )}
            </div>
          </div>
          <Switch
            id="settings-require-email-verification"
            data-testid="settings-require-email-verification"
            checked={settings.requireEmailVerification}
            disabled={disabled}
            onCheckedChange={(checked) => onChange({ requireEmailVerification: checked })}
          />
        </Field>
        <p className="text-xs text-muted-foreground" data-testid="settings-updated">
          {settings.updatedAt
            ? `Terakhir diubah ${formatRelative(settings.updatedAt)}${settings.updatedBy ? ` oleh ${settings.updatedBy}` : ''}`
            : 'Belum pernah diubah — memakai nilai awal dari konfigurasi server.'}
        </p>
      </CardContent>
    </Card>
  )
}

/** Kontainer: memuat pengaturan dan menyimpan perubahan (permission settings:read/update). */
export function AppSettingsPanel() {
  const query = useAppSettings()
  const update = useUpdateAppSettings()
  if (query.isPending) return <LoadingState label="Memuat pengaturan…" />
  if (query.isError) return <ErrorMessage error={query.error} />
  return <AppSettingsCard settings={query.data} saving={update.isPending} onChange={(patch) => update.mutate(patch)} />
}
