import { describe, expect, test } from 'bun:test'
import { debounce, runWhenIdle, shallowEqual, throttle } from '../../src/lib/perf.ts'

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('debounce', () => {
  test('hanya panggilan terakhir yang jalan; cancel & flush', async () => {
    const calls: number[] = []
    const d = debounce((n: number) => calls.push(n), 20)
    d(1)
    d(2)
    d(3)
    expect(calls).toEqual([])
    await tick(35)
    expect(calls).toEqual([3])

    d(4)
    d.cancel()
    await tick(35)
    expect(calls).toEqual([3])

    d(5)
    d.flush()
    expect(calls).toEqual([3, 5])
    d.flush() // tanpa yang tertunda: no-op
    expect(calls).toEqual([3, 5])
  })
})

describe('throttle', () => {
  test('langsung jalan pertama kali, lalu trailing sekali per jendela; cancel', async () => {
    const calls: number[] = []
    const t = throttle((n: number) => calls.push(n), 30)
    t(1)
    t(2)
    t(3)
    expect(calls).toEqual([1])
    await tick(45)
    expect(calls).toEqual([1, 3])

    t(4)
    t.cancel()
    await tick(45)
    expect(calls).toEqual([1, 3])
  })
})

describe('runWhenIdle', () => {
  test('fallback setTimeout bila requestIdleCallback tidak ada; pembatal bekerja', async () => {
    const g = globalThis as { requestIdleCallback?: unknown; cancelIdleCallback?: unknown }
    const saved = [g.requestIdleCallback, g.cancelIdleCallback]
    delete g.requestIdleCallback
    let ran = 0
    runWhenIdle(() => ran++)
    const cancel = runWhenIdle(() => ran++)
    cancel()
    await tick(5)
    expect(ran).toBe(1)

    // dengan requestIdleCallback tiruan
    let cancelled: number | undefined
    g.requestIdleCallback = (cb: () => void) => {
      cb()
      return 7
    }
    g.cancelIdleCallback = (id: number) => (cancelled = id)
    runWhenIdle(() => ran++)()
    expect(ran).toBe(2)
    expect(cancelled).toBe(7)
    ;[g.requestIdleCallback, g.cancelIdleCallback] = saved
  })
})

describe('shallowEqual', () => {
  test('membandingkan satu tingkat', () => {
    expect(shallowEqual({ a: 1 }, { a: 1 })).toBe(true)
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(shallowEqual([1, 2], [1, 2])).toBe(true)
    expect(shallowEqual({ a: {} }, { a: {} })).toBe(false)
    expect(shallowEqual(null, null)).toBe(true)
    expect(shallowEqual(null, {})).toBe(false)
    expect(shallowEqual(1, '1')).toBe(false)
  })
})
