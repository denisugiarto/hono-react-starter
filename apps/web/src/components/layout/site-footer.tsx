import { siteConfig } from '@/config/site'

export function SiteFooter() {
  return (
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      <div className="container mx-auto flex flex-col items-center gap-1 px-4">
        <p>
          API di <code className="rounded bg-muted px-1">apps/api</code> · UI di{' '}
          <code className="rounded bg-muted px-1">apps/web</code> · schema di{' '}
          <code className="rounded bg-muted px-1">packages/shared</code>
        </p>
        <a href={siteConfig.repo} className="underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
          Kode sumber
        </a>
      </div>
    </footer>
  )
}
