import { PageHeader } from '@/components/common/page-header'
import { RolesTable } from '@/features/admin'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function RolesPage() {
  useDocumentTitle('Role & permission')
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title="Role & permission"
        description="Definisi role dan matriks permission-nya (GET/POST/PATCH/DELETE /api/admin/roles). Perubahan berlaku seketika; role admin terkunci."
      />
      <RolesTable />
    </div>
  )
}
