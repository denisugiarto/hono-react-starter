import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Button } from '../../src/components/ui/button.tsx'
import { Dropdown } from '../../src/components/common/dropdown.tsx'

afterEach(cleanup)

describe('Dropdown (berbasis data)', () => {
  test('membuka menu, menampilkan judul/label/separator/pintasan, memanggil onSelect, item destructive & disabled', async () => {
    const picked: string[] = []
    render(
      <Dropdown
        trigger={<Button aria-label="Aksi" />}
        title="Aksi baris"
        items={[
          { label: 'Ubah', icon: PencilIcon, shortcut: '⌘E', onSelect: () => picked.push('ubah') },
          { type: 'label', label: 'Lainnya' },
          { label: 'Arsipkan', disabled: true, onSelect: () => picked.push('arsip') },
          { type: 'separator' },
          { label: 'Hapus', icon: Trash2Icon, destructive: true, onSelect: () => picked.push('hapus') },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Aksi' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('Aksi baris')).toBeTruthy()
    expect(within(menu).getByText('Lainnya')).toBeTruthy()
    expect(within(menu).getByText('⌘E')).toBeTruthy()
    expect(within(menu).getAllByRole('separator').length).toBeGreaterThanOrEqual(1)
    const items = within(menu).getAllByTestId('dropdown-item')
    expect(items.length).toBe(3)
    expect(items[2]!.getAttribute('data-variant')).toBe('destructive')
    expect(items[1]!.getAttribute('aria-disabled')).toBe('true')

    fireEvent.click(within(menu).getByText('Ubah'))
    expect(picked).toEqual(['ubah'])
  })
})
