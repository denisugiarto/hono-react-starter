import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  ThemeContext,
  watchSystemTheme,
  writeStoredTheme,
  type Theme,
} from '@/lib/theme'

type Props = { children: ReactNode; defaultTheme?: Theme }

/**
 * Menyediakan tema (light/dark/system) ke seluruh app. Pilihan disimpan di
 * localStorage; mode `system` mengikuti perubahan preferensi OS secara live.
 */
export function ThemeProvider({ children, defaultTheme = 'system' }: Props) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(theme))

  useEffect(() => {
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
    if (theme !== 'system') return
    return watchSystemTheme((next) => {
      setResolvedTheme(next)
      applyTheme(next)
    })
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    writeStoredTheme(next)
  }, [])

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}
