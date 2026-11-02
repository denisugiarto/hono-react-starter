/* Util performa murni (tanpa React). Versi hook ada di `hooks/use-debounce.ts`. */

// oxlint-disable-next-line no-explicit-any -- generik untuk fungsi apa pun
type AnyFn = (...args: any[]) => void

export type Debounced<F extends AnyFn> = ((...args: Parameters<F>) => void) & {
  /** Batalkan panggilan yang tertunda. */
  cancel: () => void
  /** Jalankan sekarang bila ada yang tertunda. */
  flush: () => void
}

/** Tunda eksekusi sampai `ms` ms tanpa panggilan baru (pencarian, autosave). */
export function debounce<F extends AnyFn>(fn: F, ms: number): Debounced<F> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: Parameters<F> | undefined
  const run = () => {
    timer = undefined
    if (pending) {
      const args = pending
      pending = undefined
      fn(...args)
    }
  }
  const debounced = ((...args: Parameters<F>) => {
    pending = args
    clearTimeout(timer)
    timer = setTimeout(run, ms)
  }) as Debounced<F>
  debounced.cancel = () => {
    clearTimeout(timer)
    timer = undefined
    pending = undefined
  }
  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer)
      run()
    }
  }
  return debounced
}

export type Throttled<F extends AnyFn> = ((...args: Parameters<F>) => void) & { cancel: () => void }

/** Jalankan paling banyak sekali per `ms` ms; panggilan terakhir dalam jendela ikut dijalankan (trailing). */
export function throttle<F extends AnyFn>(fn: F, ms: number): Throttled<F> {
  let last = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let trailing: Parameters<F> | undefined
  const throttled = ((...args: Parameters<F>) => {
    const now = Date.now()
    const remaining = ms - (now - last)
    if (remaining <= 0) {
      last = now
      fn(...args)
      return
    }
    trailing = args
    timer ??= setTimeout(() => {
      timer = undefined
      last = Date.now()
      if (trailing) {
        const a = trailing
        trailing = undefined
        fn(...a)
      }
    }, remaining)
  }) as Throttled<F>
  throttled.cancel = () => {
    clearTimeout(timer)
    timer = undefined
    trailing = undefined
  }
  return throttled
}

/** Jalankan saat browser senggang (`requestIdleCallback`), fallback `setTimeout`. Mengembalikan pembatal. */
export function runWhenIdle(task: () => void, timeoutMs = 2000): () => void {
  const w = globalThis as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(task, { timeout: timeoutMs })
    return () => w.cancelIdleCallback?.(id)
  }
  const id = setTimeout(task, 0)
  return () => clearTimeout(id)
}

/** Perbandingan dangkal dua objek/array — untuk `memo(Component, shallowEqual)` atau cek props. */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const ka = Object.keys(a as object)
  const kb = Object.keys(b as object)
  if (ka.length !== kb.length) return false
  return ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}
