import { PageHeader } from '@/components/common/page-header'
import { AuditLogsTable } from '@/features/admin'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function AuditLogsPage() {
  useDocumentTitle('Audit log')
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Audit log"
        description="Jejak aksi penting: autentikasi, aksi admin, dan perubahan data (GET /api/admin/audit-logs, permission audit:list)."
      />
      <AuditLogsTable />
    </div>
  )
}
