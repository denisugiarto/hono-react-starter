import { useEffect } from 'react'
import type { Decorator, Preview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import '../src/styles/globals.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

/** Tema dari toolbar → class `dark` di <html> (sama dengan ThemeProvider aplikasi). */
function ThemeSync({ theme }: { theme: string }) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return null
}

const withTheme: Decorator = (Story, context) => (
  <>
    <ThemeSync theme={context.globals.theme as string} />
    <Story />
  </>
)

/** Provider yang dibutuhkan komponen aplikasi: router (Link/NavLink), Query, Tooltip, toast. */
const withProviders: Decorator = (Story) => (
  <MemoryRouter>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Story />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  </MemoryRouter>
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
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [withProviders, withTheme],
}

export default preview
