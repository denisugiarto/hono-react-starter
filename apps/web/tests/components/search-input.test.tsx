import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SearchInput } from '../../src/components/common/search-input.tsx'

afterEach(cleanup)

describe('SearchInput', () => {
  test('uncontrolled: ketik → onChange langsung, onDebouncedChange setelah jeda; tombol bersihkan mengosongkan & fokus', async () => {
    const immediate: string[] = []
    const debounced: string[] = []
    render(<SearchInput defaultValue="" onChange={(v) => immediate.push(v)} onDebouncedChange={(v) => debounced.push(v)} debounceMs={20} />)
    const input = screen.getByRole('searchbox') as HTMLInputElement
    expect(screen.queryByTestId('search-input-clear')).toBeNull()
    fireEvent.change(input, { target: { value: 'a' } })
    fireEvent.change(input, { target: { value: 'ab' } })
    expect(immediate).toEqual(['a', 'ab'])
    expect(debounced).toEqual([])
    await waitFor(() => expect(debounced).toEqual(['ab']))

    fireEvent.click(screen.getByTestId('search-input-clear'))
    expect(input.value).toBe('')
    expect(document.activeElement).toBe(input)
    await waitFor(() => expect(debounced).toEqual(['ab', '']))
  })

  test('controlled: nilai mengikuti prop; spinner saat isLoading menggantikan tombol bersihkan', () => {
    const { rerender } = render(<SearchInput value="halo" onChange={() => {}} data-testid="q" />)
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('halo')
    expect(screen.getByTestId('q-clear')).toBeTruthy()
    rerender(<SearchInput value="halo" onChange={() => {}} data-testid="q" isLoading />)
    expect(screen.queryByTestId('q-clear')).toBeNull()
    expect(screen.getByRole('status', { name: 'Memuat' })).toBeTruthy()
    rerender(<SearchInput value="" onChange={() => {}} data-testid="q" />)
    expect(screen.queryByTestId('q-clear')).toBeNull()
  })

  test('aria-label default dari placeholder; disabled ikut ke tombol bersihkan', () => {
    render(<SearchInput defaultValue="x" placeholder="Cari pengguna…" disabled />)
    expect(screen.getByRole('searchbox', { name: 'Cari pengguna…' })).toBeTruthy()
    expect((screen.getByTestId('search-input-clear') as HTMLButtonElement).disabled).toBe(true)
  })
})
