import { lazy, type ComponentType } from 'react'

type Importer<T> = () => Promise<{ default: T }>

const RETRY_FLAG = 'lazy-retry'

/**
 * Impor dinamis yang tahan deploy: bila chunk lama hilang setelah rilis baru
 * ("Failed to fetch dynamically imported module"), halaman dimuat ulang satu kali
 * (ditandai di sessionStorage) sebelum error diteruskan ke ErrorBoundary.
 */
export async function retryImport<T>(
  importer: Importer<T>,
  { reload = () => window.location.reload(), storage = globalThis.sessionStorage as Storage | undefined } = {},
): Promise<{ default: T }> {
  try {
    const mod = await importer()
    storage?.removeItem(RETRY_FLAG)
    return mod
  } catch (err) {
    if (storage?.getItem(RETRY_FLAG)) {
      storage.removeItem(RETRY_FLAG)
      throw err
    }
    storage?.setItem(RETRY_FLAG, '1')
    reload()
    return new Promise<never>(() => {}) // tunggu reload; promise tidak pernah selesai
  }
}

/**
 * `React.lazy` + `retryImport`. Pakai untuk route berat (admin, laporan) bersama `<Suspense>`:
 *   const AuditLogsPage = lazyWithRetry(() => import('@/pages/admin/audit-logs-page'))
 */
// oxlint-disable-next-line no-explicit-any -- komponen apa pun
export function lazyWithRetry<T extends ComponentType<any>>(importer: Importer<T>) {
  return lazy(() => retryImport(importer))
}
