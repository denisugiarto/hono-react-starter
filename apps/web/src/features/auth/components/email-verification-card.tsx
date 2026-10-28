import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { paths } from '@/config/paths'
import { absoluteUrl, sendVerificationEmail } from '@/lib/auth-client'
import { useAuth } from '../hooks/use-auth.ts'

/** Status verifikasi email + tombol kirim ulang tautan. */
export function EmailVerificationCard() {
  const { user } = useAuth()
  const [pending, setPending] = useState(false)
  if (!user) return null
  const verified = user.emailVerified === true

  const resend = async () => {
    setPending(true)
    try {
      const res = await sendVerificationEmail({ email: user.email, callbackURL: absoluteUrl(paths.verifyEmail) })
      if (res.error) toast.error(res.error.message ?? 'Gagal mengirim email')
      else toast.success(`Email verifikasi dikirim ke ${user.email}`)
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Email
          <Badge variant={verified ? 'default' : 'secondary'}>{verified ? 'Terverifikasi' : 'Belum diverifikasi'}</Badge>
        </CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      {!verified && (
        <CardContent>
          <Button variant="outline" onClick={resend} disabled={pending}>
            Kirim ulang email verifikasi
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
