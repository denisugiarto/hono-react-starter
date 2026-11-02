import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useDebouncedCallback, useDebouncedValue, useThrottledCallback } from '../../src/hooks/use-debounce.ts'

afterEach(cleanup)
const tick = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

describe('useDebouncedValue', () => {
  test('nilai ikut berubah setelah jeda', async () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 20), { initialProps: { v: 'a' } })
    expect(result.current).toBe('a')
    rerender({ v: 'ab' })
    rerender({ v: 'abc' })
    expect(result.current).toBe('a')
    await tick(35)
    expect(result.current).toBe('abc')
  })
})

describe('useDebouncedCallback / useThrottledCallback', () => {
  test('identitas stabil, memanggil fn terbaru, dibatalkan saat unmount', async () => {
    const calls: string[] = []
    const { result, rerender, unmount } = renderHook(
      ({ tag }) => useDebouncedCallback((v: string) => calls.push(`${tag}:${v}`), 20),
      { initialProps: { tag: 'v1' } },
    )
    const first = result.current
    rerender({ tag: 'v2' })
    expect(result.current).toBe(first)
    result.current('x')
    await tick(35)
    expect(calls).toEqual(['v2:x'])
    result.current('y')
    unmount()
    await tick(35)
    expect(calls).toEqual(['v2:x'])
  })
  test('throttle: panggilan pertama langsung', async () => {
    const calls: number[] = []
    const { result, unmount } = renderHook(() => useThrottledCallback((n: number) => calls.push(n), 30))
    result.current(1)
    result.current(2)
    expect(calls).toEqual([1])
    unmount()
    await tick(45)
    expect(calls).toEqual([1])
  })
})
