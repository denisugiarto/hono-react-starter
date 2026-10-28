import { PageHeader } from '@/components/common/page-header'
import { ApiTokenCard } from '@/features/auth'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function ApiTokenPage() {
  useDocumentTitle('Token API')
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="Token API" description="JWT untuk API client non-browser (GET /api/auth/token)." />
      <ApiTokenCard />
    </div>
  )
}
