import { Link } from 'react-router'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { paths } from '@/config/paths'
import { siteConfig } from '@/config/site'
import { useAuth, UserMenu } from '@/features/auth'
import { MainNav } from './main-nav.tsx'
import { MobileNav } from './mobile-nav.tsx'

/** Header sticky: brand, navigasi, tema, dan area akun (login / menu pengguna). */
export function SiteHeader() {
  const { isAuthenticated, isPending } = useAuth()
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center gap-3 px-4">
        <MobileNav />
        <Link to={paths.home} className="font-semibold tracking-tight">
          {siteConfig.name}
        </Link>
        <MainNav className="ml-4 hidden md:flex" />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {isPending ? (
            <Skeleton className="h-8 w-20" />
          ) : isAuthenticated ? (
            <UserMenu />
          ) : (
            <Button size="sm" data-testid="login-link" render={<Link to={paths.login} />}>
              Masuk
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
