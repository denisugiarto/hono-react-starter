import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from '@/lib/theme'

/** Akses tema aktif + setter. Harus di dalam <ThemeProvider>. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme harus dipakai di dalam <ThemeProvider>')
  return ctx
}
