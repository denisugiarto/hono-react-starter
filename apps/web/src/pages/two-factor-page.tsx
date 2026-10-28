import { useLocation, useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { paths } from '@/config/paths'
import { TwoFactorForm } from '@/features/auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import type { LocationState } from './login-page.tsx'

/** Langkah kedua login (setelah password) untuk akun ber-2FA. */
export function TwoFactorPage() {
  useDocumentTitle('Verifikasi dua faktor')
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState)?.from ?? paths.notes

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Verifikasi dua faktor</CardTitle>
          <CardDescription>Password benar. Masukkan kode dari aplikasi authenticator untuk melanjutkan.</CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorForm onSuccess={() => navigate(from, { replace: true })} />
        </CardContent>
      </Card>
    </div>
  )
}
