import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Error boundary global: menampilkan pesan ramah alih-alih layar kosong
 * saat terjadi error render tak tertangani di React.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ui] render error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main
        role="alert"
        className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <h1 className="text-2xl font-semibold">Terjadi kesalahan</h1>
        <p className="max-w-md text-muted-foreground">
          Aplikasi mengalami error tak terduga. Muat ulang halaman untuk mencoba lagi.
        </p>
        <Button type="button" onClick={() => window.location.reload()}>
          Muat ulang
        </Button>
      </main>
    )
  }
}
