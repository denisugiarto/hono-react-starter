import { PageHeader } from '@/components/common/page-header'
import { AppSettingsPanel } from '@/features/admin'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function AppSettingsPage() {
  useDocumentTitle('Pengaturan aplikasi')
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Pengaturan aplikasi"
        description="Kebijakan runtime yang bisa diubah admin (GET/PATCH /api/admin/settings, permission settings:read/update)."
      />
      <AppSettingsPanel />
    </div>
  )
}
