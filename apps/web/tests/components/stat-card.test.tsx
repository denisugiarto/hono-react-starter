import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { UsersIcon } from 'lucide-react'
import { StatCard } from '../../src/components/common/stat-card.tsx'

afterEach(cleanup)

describe('StatCard', () => {
  test('nilai, tren naik/turun/datar dengan tanda & warna, deskripsi, ikon', () => {
    const { rerender } = render(<StatCard title="Pengguna" value="1.280" icon={UsersIcon} trend={{ value: 12.345, label: 'vs bulan lalu' }} />)
    expect(screen.getByText('Pengguna')).toBeTruthy()
    expect(screen.getByTestId('stat-card-value').textContent).toBe('1.280')
    const up = screen.getByTestId('stat-card-trend')
    expect(up.getAttribute('data-direction')).toBe('up')
    expect(up.textContent).toContain('+12,3%')
    expect(up.className).toContain('text-success')
    expect(screen.getByText('vs bulan lalu')).toBeTruthy()

    rerender(<StatCard title="Churn" value="3%" trend={{ value: -4 }} description="minggu ini" />)
    const down = screen.getByTestId('stat-card-trend')
    expect(down.getAttribute('data-direction')).toBe('down')
    expect(down.textContent).toContain('-4%')
    expect(down.className).toContain('text-destructive')
    expect(screen.getByText('minggu ini')).toBeTruthy()

    rerender(<StatCard title="Stabil" value={0} trend={{ value: 0 }} />)
    expect(screen.getByTestId('stat-card-trend').getAttribute('data-direction')).toBe('flat')
  })

  test('loading → skeleton menggantikan nilai; tanpa tren/deskripsi tidak ada baris bawah', () => {
    render(<StatCard title="Pendapatan" value="Rp 1 jt" isLoading data-testid="rev" />)
    expect(screen.getByTestId('rev-loading')).toBeTruthy()
    expect(screen.queryByTestId('rev-value')).toBeNull()
    expect(screen.queryByTestId('rev-trend')).toBeNull()
  })
})
