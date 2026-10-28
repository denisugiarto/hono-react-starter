import { Link } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { paths } from '@/config/paths'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function ForbiddenPage() {
  useDocumentTitle('Akses ditolak')
  return (
    <EmptyState
      data-testid="forbidden"
      className="mx-auto max-w-md"
      title="403 — Akses ditolak"
      description="Akun Anda tidak memiliki izin untuk membuka halaman ini."
      action={<Button render={<Link to={paths.home} />}>Ke beranda</Button>}
    />
  )
}
