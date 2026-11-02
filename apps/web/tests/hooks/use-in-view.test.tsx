import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useInView } from '../../src/hooks/use-in-view.ts'

type Callback = (entries: Array<Partial<IntersectionObserverEntry>>) => void
let observers: Array<{ cb: Callback; disconnected: boolean; observed: Element[] }> = []

class FakeIO {
  observed: Element[] = []
  disconnected = false
  constructor(public cb: Callback) {
    observers.push(this as unknown as (typeof observers)[number])
  }
  observe(el: Element) {
    this.observed.push(el)
  }
  disconnect() {
    this.disconnected = true
  }
  unobserve() {}
  takeRecords() {
    return []
  }
}

const g = globalThis as { IntersectionObserver?: unknown }
const original = g.IntersectionObserver
beforeEach(() => {
  observers = []
  g.IntersectionObserver = FakeIO
})
afterEach(() => {
  cleanup()
  g.IntersectionObserver = original
})

function Probe({ once }: { once?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>({ once, rootMargin: '10px' })
  return (
    <div ref={ref} data-testid="probe" data-inview={inView}>
      x
    </div>
  )
}

describe('useInView', () => {
  test('mengamati elemen; inView mengikuti entry; disconnect saat unmount', () => {
    const { unmount } = render(<Probe />)
    const el = screen.getByTestId('probe')
    expect(el.dataset.inview).toBe('false')
    expect(observers[0]?.observed[0]).toBe(el)
    act(() => observers[0]!.cb([{ isIntersecting: true }]))
    expect(el.dataset.inview).toBe('true')
    act(() => observers[0]!.cb([{ isIntersecting: false }]))
    expect(el.dataset.inview).toBe('false')
    act(() => observers[0]!.cb([]))
    expect(el.dataset.inview).toBe('false')
    unmount()
    expect(observers[0]?.disconnected).toBe(true)
  })
  test('once: berhenti mengamati setelah terlihat', () => {
    render(<Probe once />)
    act(() => observers[0]!.cb([{ isIntersecting: true }]))
    expect(screen.getByTestId('probe').dataset.inview).toBe('true')
    expect(observers[0]?.disconnected).toBe(true)
  })
  test('tanpa IntersectionObserver → dianggap terlihat', () => {
    delete g.IntersectionObserver
    render(<Probe />)
    expect(screen.getByTestId('probe').dataset.inview).toBe('true')
    expect(observers).toHaveLength(0)
  })
})
