import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { paths } from '@/config/paths'
import { useAuth } from '@/features/auth'
import { useDocumentTitle } from '@/hooks/use-document-title'

const ERRORS: Record<string, string> = {
  invalid_token: 'Tautan verifikasi tidak valid atau sudah kedaluwarsa (berlaku 24 jam).',
  token_expired: 'Tautan verifikasi sudah kedaluwarsa (berlaku 24 jam).',
  user_not_found: 'Akun untuk tautan ini tidak ditemukan.',
}

/**
 * Tujuan tautan email verifikasi. Server (Better Auth) memverifikasi lalu
 * redirect ke sini: tanpa query = sukses (sesi otomatis dibuat), ?error=… = gagal.
 */
export function VerifyEmailPage() {
  useDocumentTitle('Verifikasi email')
  const [params] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const error = params.get('error')

  if (error) {
    return (
      <EmptyState
        className="mx-auto max-w-md"
        title="Verifikasi gagal"
        description={ERRORS[error.toLowerCase()] ?? `Terjadi kesalahan (${error}).`}
        action={
          <Button render={<Link to={isAuthenticated ? paths.security : paths.login} />}>
            {isAuthenticated ? 'Kirim ulang dari pengaturan' : 'Ke halaman masuk'}
          </Button>
        }
      />
    )
  }

  return (
    <EmptyState
      className="mx-auto max-w-md"
      title="Email terverifikasi"
      description="Terima kasih. Akun Anda sudah aktif sepenuhnya."
      action={
        <Button render={<Link to={isAuthenticated ? paths.notes : paths.login} />}>
          {isAuthenticated ? 'Buka catatan' : 'Masuk'}
        </Button>
      }
    />
  )
}
