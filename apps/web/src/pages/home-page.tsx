import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { paths } from '@/config/paths'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/features/auth'
import { HealthCard, HelloCard } from '@/features/system'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function HomePage() {
  useDocumentTitle()
  const { isAuthenticated } = useAuth()
  return (
    <div className="flex flex-col items-center gap-10">
      <section className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {siteConfig.stack.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">{siteConfig.name}</h1>
        <p className="max-w-xl text-pretty text-muted-foreground">{siteConfig.description}</p>
        <div className="flex gap-2">
          {isAuthenticated ? (
            <Button render={<Link to={paths.notes} />}>Buka catatan</Button>
          ) : (
            <Button render={<Link to={paths.login} />}>Masuk untuk mulai</Button>
          )}
          <Button variant="outline" render={<a href={siteConfig.repo} target="_blank" rel="noreferrer" />}>
            Kode sumber
          </Button>
        </div>
      </section>

      <section className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        <HealthCard />
        <HelloCard />
      </section>
    </div>
  )
}
