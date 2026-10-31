import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../../src/components/common/data-table.tsx'

afterEach(cleanup)

type Row = { id: string; name: string; score: number; city: string }
const rows: Row[] = Array.from({ length: 23 }, (_, i) => ({
  id: `r${i + 1}`,
  name: `Orang ${String(i + 1).padStart(2, '0')}`,
  score: (i * 7) % 23,
  city: i % 2 ? 'Bandung' : 'Jakarta',
}))
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Nama', enableHiding: false, meta: { label: 'Nama' } },
  { accessorKey: 'score', header: 'Skor', meta: { label: 'Skor', align: 'right' } },
  { accessorKey: 'city', header: 'Kota', enableSorting: false, meta: { label: 'Kota' } },
]

const bodyRows = () => within(screen.getByTestId('data-table')).getAllByRole('row').slice(1)
const firstCell = () => bodyRows()[0]!.querySelector('td')!.textContent

describe('DataTable', () => {
  test('paginasi: 10 per halaman, navigasi, ubah ukuran halaman', () => {
    render(<DataTable columns={columns} data={rows} getRowId={(r) => r.id} />)
    expect(bodyRows().length).toBe(10)
    expect(screen.getByTestId('data-table-page').textContent).toBe('Halaman 1 dari 3')
    expect(screen.getByTestId('data-table-count').textContent).toBe('23 baris')
    expect((screen.getByTestId('data-table-prev') as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByTestId('data-table-next'))
    expect(screen.getByTestId('data-table-page').textContent).toBe('Halaman 2 dari 3')
    expect(firstCell()).toBe('Orang 11')
    fireEvent.click(screen.getByTestId('data-table-next'))
    expect(bodyRows().length).toBe(3)
    expect((screen.getByTestId('data-table-next') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByTestId('data-table-prev'))
    expect(screen.getByTestId('data-table-page').textContent).toBe('Halaman 2 dari 3')

    fireEvent.change(screen.getByTestId('data-table-page-size'), { target: { value: '50' } })
    expect(bodyRows().length).toBe(23)
    expect(screen.getByTestId('data-table-page').textContent).toBe('Halaman 1 dari 1')
  })

  test('sorting: klik header → naik, turun, lalu reset; kolom tanpa sorting tidak punya tombol; aria-sort', () => {
    render(<DataTable columns={columns} data={rows} pageSize={0} />)
    const sortScore = screen.getByTestId('data-table-sort-score')
    const th = sortScore.closest('th')!
    expect(th.getAttribute('aria-sort')).toBe('none')
    fireEvent.click(sortScore)
    expect(th.getAttribute('aria-sort')).toBe('ascending')
    expect(bodyRows()[0]!.querySelectorAll('td')[1]!.textContent).toBe('0')
    fireEvent.click(sortScore)
    expect(th.getAttribute('aria-sort')).toBe('descending')
    expect(bodyRows()[0]!.querySelectorAll('td')[1]!.textContent).toBe('22')
    fireEvent.click(sortScore)
    expect(th.getAttribute('aria-sort')).toBe('none')
    expect(firstCell()).toBe('Orang 01')
    expect(screen.queryByTestId('data-table-sort-city')).toBeNull()
    expect(screen.queryByTestId('data-table-page')).toBeNull() // pageSize 0 → tanpa paginasi
    expect(bodyRows().length).toBe(23)
  })

  test('pencarian global menyaring baris; tanpa hasil → pesan; hitungan "x dari y"', () => {
    render(<DataTable columns={columns} data={rows} searchable />)
    const search = screen.getByTestId('data-table-search')
    fireEvent.change(search, { target: { value: 'Orang 2' } })
    expect(bodyRows().length).toBe(4) // 02, 20, 21, 22, 23 → 02,20,21,22,23 = 5? 'Orang 2' cocok 02? tidak: "Orang 02" tidak mengandung "Orang 2"
    expect(screen.getByTestId('data-table-count').textContent).toBe('4 baris dari 23')
    fireEvent.change(search, { target: { value: 'tidak-ada' } })
    expect(screen.getByText('Tidak ada hasil untuk pencarian ini.')).toBeTruthy()
  })

  test('menu kolom menyembunyikan kolom yang boleh disembunyikan', async () => {
    render(<DataTable columns={columns} data={rows.slice(0, 3)} columnToggle />)
    expect(screen.getByRole('columnheader', { name: /Kota/ })).toBeTruthy()
    fireEvent.click(screen.getByTestId('data-table-columns'))
    const menu = await screen.findByRole('menu')
    expect(within(menu).queryByText('Nama')).toBeNull() // enableHiding: false
    fireEvent.click(within(menu).getByText('Kota'))
    await waitFor(() => expect(screen.queryByRole('columnheader', { name: /Kota/ })).toBeNull())
  })

  test('state loading, error, kosong; klik baris; rowProps', () => {
    const { rerender } = render(<DataTable columns={columns} data={[]} isLoading loadingLabel="Memuat orang…" />)
    expect(screen.getByRole('status', { name: 'Memuat orang…' })).toBeTruthy()
    rerender(<DataTable columns={columns} data={[]} error={new Error('Rusak')} />)
    expect(screen.getByText('Rusak')).toBeTruthy()
    rerender(<DataTable columns={columns} data={[]} emptyTitle="Belum ada orang" />)
    expect(screen.getByTestId('data-table-empty').textContent).toContain('Belum ada orang')

    const clicked: string[] = []
    rerender(
      <DataTable
        columns={columns}
        data={rows.slice(0, 2)}
        onRowClick={(r) => clicked.push(r.id)}
        rowProps={(r) => ({ 'data-testid': 'orang-row', 'data-id': r.id })}
      />,
    )
    const first = screen.getAllByTestId('orang-row')[0]!
    expect(first.getAttribute('data-id')).toBe('r1')
    fireEvent.click(first)
    expect(clicked).toEqual(['r1'])
  })
})
