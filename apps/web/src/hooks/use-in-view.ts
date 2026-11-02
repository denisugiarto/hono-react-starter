import { useEffect, useRef, useState, type RefObject } from 'react'

export type UseInViewOptions = IntersectionObserverInit & {
  /** Berhenti mengamati setelah pertama kali terlihat (lazy load gambar/section). */
  once?: boolean
}

/**
 * Apakah elemen terlihat di viewport (IntersectionObserver). Tanpa dukungan IO
 * (browser lama/test) dianggap terlihat agar konten tetap tampil.
 *   const { ref, inView } = useInView<HTMLDivElement>({ once: true, rootMargin: '200px' })
 */
export function useInView<T extends Element = HTMLDivElement>(
  options: UseInViewOptions = {},
): { ref: RefObject<T | null>; inView: boolean } {
  const { once = false, root = null, rootMargin, threshold } = options
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry?.isIntersecting ?? false
        setInView(visible)
        if (visible && once) observer.disconnect()
      },
      { root, rootMargin, threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [once, root, rootMargin, threshold])

  return { ref, inView }
}
