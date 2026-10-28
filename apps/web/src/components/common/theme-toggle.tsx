import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'

/** Tombol ganti tema terang/gelap (ikon mengikuti tema aktif). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const next = resolvedTheme === 'dark' ? 'light' : 'dark'
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Ganti ke tema ${next === 'dark' ? 'gelap' : 'terang'}`}
      onClick={() => setTheme(next)}
    >
      {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
