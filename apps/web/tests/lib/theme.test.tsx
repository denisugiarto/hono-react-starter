import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, cleanup, render, screen } from '@testing-library/react'
import { ThemeProvider } from '../../src/components/theme-provider.tsx'
import { useTheme } from '../../src/hooks/use-theme.ts'
import { isTheme, readStoredTheme, resolveTheme, systemTheme, writeStoredTheme } from '../../src/lib/theme.ts'

type Listener = (e: { matches: boolean }) => void
const mql = { matches: false, listeners: [] as Listener[] }
const originalMatchMedia = window.matchMedia

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.classList.remove('dark')
  mql.matches = false
  mql.listeners = []
  window.matchMedia = ((query: string) => ({
    matches: mql.matches,
    media: query,
    addEventListener: (_: string, fn: Listener) => mql.listeners.push(fn),
    removeEventListener: (_: string, fn: Listener) => {
      mql.listeners = mql.listeners.filter((l) => l !== fn)
    },
  })) as unknown as typeof window.matchMedia
})
afterEach(() => {
  cleanup()
  window.matchMedia = originalMatchMedia
})

function Probe() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('system')}>system</button>
      <button onClick={() => setTheme('dark')}>dark</button>
    </div>
  )
}

describe('lib/theme', () => {
  test('isTheme / readStoredTheme / writeStoredTheme', () => {
    expect(isTheme('dark')).toBe(true)
    expect(isTheme('biru')).toBe(false)
    expect(readStoredTheme()).toBeNull()
    writeStoredTheme('light')
    expect(readStoredTheme()).toBe('light')
    window.localStorage.setItem('theme', 'ngawur')
    expect(readStoredTheme()).toBeNull()
  })

  test('storage error tidak melempar', () => {
    const ls = window.localStorage
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    try {
      expect(readStoredTheme()).toBeNull()
      expect(() => writeStoredTheme('dark')).not.toThrow()
    } finally {
      Object.defineProperty(window, 'localStorage', { configurable: true, value: ls })
    }
  })

  test('systemTheme / resolveTheme mengikuti matchMedia', () => {
    expect(systemTheme()).toBe('light')
    mql.matches = true
    expect(systemTheme()).toBe('dark')
    expect(resolveTheme('system')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
  })
})

describe('ThemeProvider', () => {
  test('mode system mengikuti perubahan OS secara live; pindah ke dark melepas listener', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme').textContent).toBe('system')
    expect(screen.getByTestId('resolved').textContent).toBe('light')
    expect(mql.listeners.length).toBe(1)

    act(() => mql.listeners[0]!({ matches: true }))
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => screen.getByRole('button', { name: 'dark' }).click())
    expect(mql.listeners.length).toBe(0)
    expect(window.localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')

    act(() => screen.getByRole('button', { name: 'system' }).click())
    expect(mql.listeners.length).toBe(1)
  })

  test('useTheme di luar provider → error', () => {
    const spy = console.error
    console.error = () => {}
    try {
      expect(() => render(<Probe />)).toThrow(/ThemeProvider/)
    } finally {
      console.error = spy
    }
  })
})
