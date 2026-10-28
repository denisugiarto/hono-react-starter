import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { getJwtToken } from '@/lib/auth-client'

/**
 * Terbitkan JWT (GET /api/auth/token) untuk dipakai API client non-browser
 * dengan header `Authorization: Bearer <token>`.
 */
export function ApiTokenCard() {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const issue = async () => {
    setError(null)
    setPending(true)
    try {
      setToken(await getJwtToken())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat token')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token API (JWT)</CardTitle>
        <CardDescription>
          Berlaku 15 menit, diverifikasi stateless lewat JWKS. Contoh:{' '}
          <code className="rounded bg-muted px-1">curl -H "Authorization: Bearer …" /api/notes</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {token ? (
          <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{token}</code>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada token. Klik tombol di bawah.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={issue} disabled={pending}>
          {token ? 'Perbarui token' : 'Buat token'}
        </Button>
      </CardFooter>
    </Card>
  )
}
