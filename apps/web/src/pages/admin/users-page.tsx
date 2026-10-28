import { PageHeader } from '@/components/common/page-header'
import { UsersTable } from '@/features/admin'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function UsersPage() {
  useDocumentTitle('Pengguna')
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader title="Pengguna" description="Semua akun terdaftar (GET /api/admin/users, permission user:list)." />
      <UsersTable />
    </div>
  )
}
