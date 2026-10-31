import { useEffect } from 'react'
import type { Decorator, Preview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useTheme } from '@/hooks/use-theme'
import type { Theme } from '@/lib/theme'
import '../src/styles/globals.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

/**
 * Tema dari toolbar → ThemeProvider aplikasi (bukan toggle class manual), sehingga
 * komponen yang memanggil `useTheme()` (Toaster/sonner, ThemeToggle) ikut bekerja.
 */
function ThemeSync({ theme }: { theme: Theme }) {
  const { setTheme } = useTheme()
  useEffect(() => {
    setTheme(theme)
  }, [theme, setTheme])
  return null
}

/**
 * Provider yang dibutuhkan komponen aplikasi: tema, router (Link/NavLink), Query, Tooltip, toast.
 * Path awal router diatur per story lewat `parameters.initialPath` (default `/`) — jangan
 * membuat MemoryRouter lagi di story (React Router menolak router bersarang).
 */
const withProviders: Decorator = (Story, context) => (
  <ThemeProvider defaultTheme="light">
    <ThemeSync theme={context.globals.theme as Theme} />
    <MemoryRouter initialEntries={[(context.parameters.initialPath as string | undefined) ?? '/']}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Story />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>
  </ThemeProvider>
)

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    a11y: { test: 'todo' },
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: 'Tema',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Terang' },
          { value: 'dark', title: 'Gelap' },
          { value: 'system', title: 'Ikut sistem' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [withProviders],
}

export default preview
