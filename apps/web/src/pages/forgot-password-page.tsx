import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ForgotPasswordForm } from '@/features/auth'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function ForgotPasswordPage() {
  useDocumentTitle('Lupa password')
  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Lupa password</CardTitle>
          <CardDescription>Masukkan email akun Anda. Kami kirim tautan untuk mengatur ulang password.</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
