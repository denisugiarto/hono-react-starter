import { Link } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { paths } from '@/config/paths'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function NotFoundPage() {
  useDocumentTitle('Halaman tidak ditemukan')
  return (
    <EmptyState
      className="mx-auto max-w-md"
      title="404 — Halaman tidak ditemukan"
      description="Alamat yang Anda buka tidak ada atau sudah dipindahkan."
      action={<Button render={<Link to={paths.home} />}>Ke beranda</Button>}
    />
  )
}
