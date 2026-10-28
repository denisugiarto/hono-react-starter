import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { paths } from '@/config/paths'

/** errorElement router: error render/loader di bawah route root. */
export function RouteErrorPage() {
  const error = useRouteError()
  const title = isRouteErrorResponse(error) ? `${error.status} — ${error.statusText}` : 'Terjadi kesalahan'
  const description = error instanceof Error ? error.message : 'Silakan muat ulang atau kembali ke beranda.'
  return (
    <main role="alert" className="container mx-auto px-4 py-16">
      <EmptyState
        className="mx-auto max-w-md"
        title={title}
        description={description}
        action={<Button render={<Link to={paths.home} />}>Ke beranda</Button>}
      />
    </main>
  )
}
