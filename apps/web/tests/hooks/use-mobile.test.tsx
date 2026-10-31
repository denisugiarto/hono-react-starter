import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useIsMobile } from '../../src/hooks/use-mobile.ts'

type Listener = (e: { matches: boolean }) => void

/** matchMedia palsu: menangkap listener agar perubahan lebar bisa dipicu dari test. */
function installMatchMedia() {
  const listeners = new Set<Listener>()
  const removed: Listener[] = []
  window.matchMedia = ((query: string) => ({
    matches: window.innerWidth < 768,
    media: query,
    addEventListener: (_: string, l: Listener) => void listeners.add(l),
    removeEventListener: (_: string, l: Listener) => {
      listeners.delete(l)
      removed.push(l)
    },
  })) as unknown as typeof window.matchMedia
  return { listeners, removed }
}

function Probe() {
  const mobile = useIsMobile()
  return <output data-testid="mobile">{String(mobile)}</output>
}

const setWidth = (w: number) => Object.defineProperty(window, 'innerWidth', { value: w, configurable: true, writable: true })

afterEach(cleanup)

describe('useIsMobile', () => {
  test('mengikuti lebar jendela dan bereaksi pada event media query; listener dilepas saat unmount', () => {
    const mm = installMatchMedia()
    setWidth(1024)
    const { unmount } = render(<Probe />)
    expect(screen.getByTestId('mobile').textContent).toBe('false')
    expect(mm.listeners.size).toBe(1)

    act(() => {
      setWidth(500)
      for (const l of mm.listeners) l({ matches: true })
    })
    expect(screen.getByTestId('mobile').textContent).toBe('true')

    unmount()
    expect(mm.removed.length).toBe(1)
    expect(mm.listeners.size).toBe(0)
  })
})
