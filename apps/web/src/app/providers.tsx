import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/common/error-boundary'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient as defaultQueryClient } from '@/lib/query-client'

type Props = { children: ReactNode; queryClient?: QueryClient }

/**
 * Semua provider global dalam satu tempat (urutan luar → dalam):
 * ErrorBoundary → Theme → QueryClient → Tooltip, plus Toaster (sonner).
 * `queryClient` bisa diganti (test memakai instance baru per kasus).
 */
export function Providers({ children, queryClient = defaultQueryClient }: Props) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-right" richColors closeButton />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
