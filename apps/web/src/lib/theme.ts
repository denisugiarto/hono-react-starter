import { createContext } from 'react'

/** Tema aplikasi: eksplisit terang/gelap, atau ikut preferensi sistem. */
export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEMES: readonly Theme[] = ['light', 'dark', 'system']
export const THEME_STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

export type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

/** Baca tema tersimpan; null bila belum ada / storage tidak tersedia. */
export function readStoredTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(raw) ? raw : null
  } catch {
    return null
  }
}

export function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // storage tidak tersedia (mode privat, dsb.) — abaikan
  }
}

/** Preferensi sistem saat ini. */
export function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? systemTheme() : theme
}

/** Terapkan ke <html>: class `dark` (Tailwind `@custom-variant dark`) + color-scheme. */
export function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

/** Pantau perubahan preferensi sistem; mengembalikan fungsi pembersih. */
export function watchSystemTheme(onChange: (resolved: ResolvedTheme) => void): () => void {
  const mql = window.matchMedia(DARK_QUERY)
  const handler = (e: MediaQueryListEvent) => onChange(e.matches ? 'dark' : 'light')
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}
