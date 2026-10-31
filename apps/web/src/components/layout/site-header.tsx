import { Link } from 'react-router'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { paths } from '@/config/paths'
import { siteConfig } from '@/config/site'
import { useAuth, UserMenu } from '@/features/auth'
import { MainNav } from './main-nav.tsx'
import { MobileNav } from './mobile-nav.tsx'
import { Navbar } from './navbar.tsx'

/** Header aplikasi: Navbar dengan brand, navigasi, tema, dan area akun (login / menu pengguna). */
export function SiteHeader() {
  const { isAuthenticated, isPending } = useAuth()
  return (
    <Navbar
      start={<MobileNav />}
      brand={<Link to={paths.home}>{siteConfig.name}</Link>}
      end={
        <>
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
        </>
      }
    >
      <MainNav className="ml-4 hidden md:flex" />
    </Navbar>
  )
}
