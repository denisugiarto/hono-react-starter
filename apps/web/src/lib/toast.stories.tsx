import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import { notify } from './toast'

const meta = { title: 'Common/Toast', parameters: { layout: 'centered' } } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Toaster sudah dipasang oleh decorator Storybook (sama dengan Providers aplikasi). */
export const Semua: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button color="success" appearance="soft" onClick={() => notify.success('Catatan dibuat')}>
        success
      </Button>
      <Button color="info" appearance="soft" onClick={() => notify.info('Versi baru tersedia', { description: 'Muat ulang untuk memperbarui.' })}>
        info
      </Button>
      <Button color="warning" appearance="soft" onClick={() => notify.warning('Sesi hampir habis', { action: { label: 'Perpanjang', onClick: () => notify.success('Diperpanjang') } })}>
        warning
      </Button>
      <Button color="danger" appearance="soft" onClick={() => notify.error('Gagal menyimpan', { description: 'Coba lagi beberapa saat.' })}>
        error
      </Button>
      <Button color="neutral" appearance="outline" onClick={() => notify.message('Pesan netral')}>
        message
      </Button>
      <Button
        color="primary"
        appearance="outline"
        onClick={() =>
          notify.promise(new Promise((r) => setTimeout(r, 1500)), { loading: 'Menyimpan…', success: 'Tersimpan', error: 'Gagal' })
        }
      >
        promise
      </Button>
    </div>
  ),
}
