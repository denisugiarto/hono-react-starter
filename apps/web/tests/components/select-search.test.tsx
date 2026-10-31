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
