import { toast as sonner, type ExternalToast } from 'sonner'

/**
 * Pembungkus tipis Sonner dengan nama dan default yang konsisten di seluruh aplikasi.
 * Toaster (`components/ui/sonner.tsx`) sudah dipasang di Providers; ikon per jenis
 * mengikuti tema. Pakai ini alih-alih `toast` sonner langsung agar durasi/aksi seragam.
 *
 *   notify.success('Catatan dibuat')
 *   notify.error('Gagal menyimpan', { description: err.message })
 *   notify.warning('Sesi hampir habis', { action: { label: 'Perpanjang', onClick: refresh } })
 *   notify.promise(saveNote(), { loading: 'Menyimpan…', success: 'Tersimpan', error: 'Gagal' })
 */
export type NotifyOptions = Pick<ExternalToast, 'description' | 'duration' | 'action' | 'cancel' | 'id' | 'onDismiss' | 'onAutoClose'>

const DEFAULT_DURATION = 4000
const ERROR_DURATION = 6000

export const notify = {
  success: (message: string, options: NotifyOptions = {}) => sonner.success(message, { duration: DEFAULT_DURATION, ...options }),
  info: (message: string, options: NotifyOptions = {}) => sonner.info(message, { duration: DEFAULT_DURATION, ...options }),
  warning: (message: string, options: NotifyOptions = {}) => sonner.warning(message, { duration: ERROR_DURATION, ...options }),
  /** Error bertahan lebih lama dan punya tombol tutup. */
  error: (message: string, options: NotifyOptions = {}) => sonner.error(message, { duration: ERROR_DURATION, closeButton: true, ...options }),
  /** Toast netral tanpa ikon. */
  message: (message: string, options: NotifyOptions = {}) => sonner.message(message, { duration: DEFAULT_DURATION, ...options }),
  loading: (message: string, options: NotifyOptions = {}) => sonner.loading(message, options),
  /** Loading → success/error mengikuti promise. */
  promise: <T>(promise: Promise<T>, messages: { loading: string; success: string | ((data: T) => string); error: string | ((err: unknown) => string) }) =>
    sonner.promise(promise, messages),
  dismiss: (id?: string | number) => sonner.dismiss(id),
}
