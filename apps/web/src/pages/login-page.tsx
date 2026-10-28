import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { paths } from '@/config/paths'
import { AuthForm, useAuth } from '@/features/auth'
import { useDocumentTitle } from '@/hooks/use-document-title'

export type LocationState = { from?: string } | null

export function LoginPage() {
  useDocumentTitle('Masuk')
  const { isAuthenticated, isPending } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState)?.from ?? paths.notes

  // Sudah login (mis. buka /login langsung) → lanjut ke tujuan.
  useEffect(() => {
    if (!isPending && isAuthenticated) navigate(from, { replace: true })
  }, [isPending, isAuthenticated, from, navigate])

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Masuk</CardTitle>
          <CardDescription>Gunakan email dan password, atau daftar akun baru.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            onSuccess={() => navigate(from, { replace: true })}
            onTwoFactor={() => navigate(paths.twoFactor, { state: { from } })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
