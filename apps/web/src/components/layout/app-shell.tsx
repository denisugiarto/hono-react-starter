import { Outlet } from 'react-router'
import { SiteFooter } from './site-footer.tsx'
import { SiteHeader } from './site-header.tsx'

/** Kerangka halaman: header → konten route (Outlet) → footer. */
export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="container mx-auto w-full flex-1 px-4 py-8">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
