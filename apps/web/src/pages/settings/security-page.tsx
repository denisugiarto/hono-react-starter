import { PageHeader } from '@/components/common/page-header'
import { ChangePasswordCard, EmailVerificationCard, TwoFactorCard } from '@/features/auth'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function SecurityPage() {
  useDocumentTitle('Keamanan')
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="Keamanan" description="Verifikasi email, password, dan autentikasi dua faktor." />
      <EmailVerificationCard />
      <TwoFactorCard />
      <ChangePasswordCard />
    </div>
  )
}
