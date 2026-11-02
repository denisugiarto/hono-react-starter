import { useEffect, useMemo, useRef, useState } from 'react'
import { debounce, throttle } from '@/lib/perf'

/** Nilai yang baru berubah setelah `ms` ms tenang — untuk query pencarian dari input controlled. */
export function useDebouncedValue<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

// oxlint-disable-next-line no-explicit-any -- generik untuk fungsi apa pun
type AnyFn = (...args: any[]) => void

function useLatest<F extends AnyFn>(fn: F) {
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  }, [fn])
  return ref
}

/** Callback ter-debounce dengan identitas stabil; selalu memanggil versi `fn` terbaru. `.cancel()`/`.flush()` tersedia. */
export function useDebouncedCallback<F extends AnyFn>(fn: F, ms = 300) {
  const latest = useLatest(fn)
  const debounced = useMemo(() => debounce((...args: Parameters<F>) => latest.current(...args), ms), [latest, ms])
  useEffect(() => () => debounced.cancel(), [debounced])
  return debounced
}

/** Callback ter-throttle (scroll, resize, drag) dengan identitas stabil. */
export function useThrottledCallback<F extends AnyFn>(fn: F, ms = 100) {
  const latest = useLatest(fn)
  const throttled = useMemo(() => throttle((...args: Parameters<F>) => latest.current(...args), ms), [latest, ms])
  useEffect(() => () => throttled.cancel(), [throttled])
  return throttled
}
