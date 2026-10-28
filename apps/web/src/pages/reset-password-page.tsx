import { useNavigate, useSearchParams } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { paths } from '@/config/paths'
import { ResetPasswordForm } from '@/features/auth'
import { useDocumentTitle } from '@/hooks/use-document-title'

/** Tujuan tautan email reset: /reset-password?token=… (atau ?error=INVALID_TOKEN). */
export function ResetPasswordPage() {
  useDocumentTitle('Atur ulang password')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Atur ulang password</CardTitle>
          <CardDescription>Buat password baru untuk akun Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm
            token={params.get('token')}
            errorCode={params.get('error')}
            onSuccess={() => navigate(paths.login, { replace: true })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
