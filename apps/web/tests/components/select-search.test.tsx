import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SelectSearch, type SelectSearchOption } from '../../src/components/common/select-search.tsx'

afterEach(cleanup)

const options: SelectSearchOption[] = [
  { value: 'jkt', label: 'Jakarta', description: 'DKI' },
  { value: 'bdg', label: 'Bandung' },
  { value: 'sby', label: 'Surabaya', disabled: true },
]

describe('SelectSearch (dropdown dengan pencarian)', () => {
  test('placeholder → buka → cari menyaring → pilih → nilai tampil; kosong → pesan', async () => {
    const changes: (string | null)[] = []
    const { rerender } = render(<SelectSearch options={options} value={null} onChange={(v) => changes.push(v)} placeholder="Pilih kota" />)
    const trigger = screen.getByTestId('select-search')
    expect(trigger.textContent).toContain('Pilih kota')

    fireEvent.click(trigger)
    const search = await screen.findByTestId('select-search-search')
    await waitFor(() => expect(screen.getAllByTestId('select-search-option').length).toBe(3))
    expect(screen.getByText('DKI')).toBeTruthy()

    fireEvent.change(search, { target: { value: 'ban' } })
    await waitFor(() => expect(screen.getAllByTestId('select-search-option').length).toBe(1))
    fireEvent.click(screen.getByText('Bandung'))
    await waitFor(() => expect(changes).toEqual(['bdg']))

    rerender(<SelectSearch options={options} value="bdg" onChange={(v) => changes.push(v)} placeholder="Pilih kota" />)
    expect(screen.getByTestId('select-search').textContent).toContain('Bandung')

    fireEvent.click(screen.getByTestId('select-search'))
    const search2 = await screen.findByTestId('select-search-search')
    fireEvent.change(search2, { target: { value: 'zzz' } })
    expect(await screen.findByText('Tidak ada hasil.')).toBeTruthy()
  })

  test('renderValue & disabled', () => {
    render(
      <SelectSearch options={options} value="jkt" onChange={() => {}} renderValue={(o) => `Kota: ${o.label}`} disabled data-testid="k" />,
    )
    const trigger = screen.getByTestId('k')
    expect(trigger.textContent).toContain('Kota: Jakarta')
    expect(trigger.hasAttribute('disabled') || trigger.getAttribute('aria-disabled') === 'true' || trigger.getAttribute('data-disabled') !== null).toBe(true)
  })
})

describe('SelectSearch — searchable=false & multiple', () => {
  test('satu pilihan tanpa pencarian: popup hanya daftar, pilih mengubah nilai', async () => {
    const changes: (string | null)[] = []
    render(<SelectSearch options={options} value={null} onChange={(v) => changes.push(v)} searchable={false} data-testid="s" />)
    fireEvent.click(screen.getByTestId('s'))
    await waitFor(() => expect(screen.getAllByTestId('s-option').length).toBe(3))
    expect(screen.queryByTestId('s-search')).toBeNull()
    fireEvent.click(screen.getByText('Jakarta'))
    await waitFor(() => expect(changes).toEqual(['jkt']))
  })

  test('banyak pilihan dengan pencarian: chip per nilai, input cari di dalam kotak, pilih menambah, hapus chip mengurangi', async () => {
    const changes: string[][] = []
    const { rerender } = render(
      <SelectSearch multiple options={options} value={['jkt']} onChange={(v) => changes.push(v)} placeholder="Pilih kota" data-testid="m" />,
    )
    expect(screen.getAllByTestId('m-chip').length).toBe(1)
    expect(screen.getByTestId('m-chip').textContent).toContain('Jakarta')
    const search = screen.getByTestId('m-search') as HTMLInputElement
    expect(search.placeholder).toBe('Cari…')

    // Buka popup dari input (Base UI: fokus + panah bawah), lalu ketik untuk menyaring
    fireEvent.focus(search)
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getAllByTestId('m-option').length).toBe(3))
    fireEvent.change(search, { target: { value: 'ban' } })
    await waitFor(() => expect(screen.getAllByTestId('m-option').length).toBe(1))
    fireEvent.click(screen.getByText('Bandung'))
    await waitFor(() => expect(changes.at(-1)).toEqual(['jkt', 'bdg']))

    rerender(<SelectSearch multiple options={options} value={['jkt', 'bdg']} onChange={(v) => changes.push(v)} placeholder="Pilih kota" data-testid="m" />)
    expect(screen.getAllByTestId('m-chip').length).toBe(2)
    const remove = screen.getAllByTestId('m-chip')[0]!.querySelector('[data-slot=combobox-chip-remove]') as HTMLElement
    fireEvent.click(remove)
    await waitFor(() => expect(changes.at(-1)).toEqual(['bdg']))

    rerender(<SelectSearch multiple options={options} value={[]} onChange={(v) => changes.push(v)} placeholder="Pilih kota" data-testid="m" />)
    expect((screen.getByTestId('m-search') as HTMLInputElement).placeholder).toBe('Pilih kota')
  })

  test('banyak pilihan tanpa pencarian: pemicu meringkas chip (+n), popup daftar tanpa input', async () => {
    const changes: string[][] = []
    render(
      <SelectSearch multiple searchable={false} maxVisibleChips={1} options={options} value={['jkt', 'bdg']} onChange={(v) => changes.push(v)} data-testid="n" />,
    )
    const summary = screen.getByTestId('n-summary')
    expect(summary.textContent).toContain('Jakarta')
    expect(summary.textContent).toContain('+1')
    expect(summary.textContent).not.toContain('Bandung')
    fireEvent.click(screen.getByTestId('n'))
    await waitFor(() => expect(screen.getAllByTestId('n-option').length).toBe(3))
    expect(screen.queryByTestId('n-search')).toBeNull()
    fireEvent.click(screen.getAllByText('Bandung').at(-1)!)
    await waitFor(() => expect(changes.at(-1)).toEqual(['jkt']))
  })

  test('banyak pilihan kosong tanpa pencarian → placeholder', () => {
    render(<SelectSearch multiple searchable={false} options={options} value={[]} onChange={() => {}} placeholder="Pilih beberapa" data-testid="e" />)
    expect(screen.getByTestId('e').textContent).toContain('Pilih beberapa')
  })
})
