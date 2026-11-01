import { afterEach, describe, expect, test } from 'bun:test'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DatePicker, DateRangePicker, DEFAULT_RANGE_PRESETS } from '../../src/components/common/date-picker.tsx'
import type { DateRangeValue } from '../../src/lib/datetime.ts'

/** Pembungkus controlled agar klik kedua melihat nilai dari klik pertama. */
function RangeHarness({ onChange }: { onChange: (v: DateRangeValue | null) => void }) {
  const [value, setValue] = useState<DateRangeValue | null>(null)
  return (
    <DateRangePicker
      value={value}
      onChange={(v) => {
        setValue(v)
        onChange(v)
      }}
    />
  )
}

afterEach(cleanup)

const ymd = (d: Date | null) => (d ? [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()].join('-') : 'null')
/** Tombol hari di kalender (react-day-picker: button dengan data-day). */
const dayButton = (content: HTMLElement, day: number) =>
  within(content)
    .getAllByRole('button')
    .find((b) => b.textContent === String(day) && !b.hasAttribute('data-outside') && b.getAttribute('aria-disabled') !== 'true')!

describe('DatePicker', () => {
  test('placeholder → buka → pilih hari → nilai startOfDay; label terformat; bersihkan', async () => {
    const changes: (Date | null)[] = []
    const { rerender } = render(<DatePicker value={null} onChange={(v) => changes.push(v)} placeholder="Pilih tanggal" />)
    const trigger = screen.getByTestId('date-picker')
    expect(trigger.textContent).toContain('Pilih tanggal')
    expect(trigger.getAttribute('data-empty')).toBe('true')
    expect(screen.queryByTestId('date-picker-clear')).toBeNull()

    fireEvent.click(trigger)
    const content = await screen.findByTestId('date-picker-content')
    fireEvent.click(dayButton(content, 15))
    await waitFor(() => expect(changes.length).toBe(1))
    const picked = changes[0]!
    expect(picked.getDate()).toBe(15)
    expect([picked.getHours(), picked.getMinutes()]).toEqual([0, 0])

    const v = new Date(2026, 2, 5)
    rerender(<DatePicker value={v} onChange={(x) => changes.push(x)} />)
    expect(screen.getByTestId('date-picker').textContent).toContain('5 Mar 2026')
    fireEvent.click(screen.getByTestId('date-picker-clear'))
    expect(changes.at(-1)).toBeNull()
  })

  test('withTime: label dengan jam, TimePicker mengubah jam tanpa mengubah tanggal; pilih hari mempertahankan jam', async () => {
    const changes: (Date | null)[] = []
    const v = new Date(2026, 5, 10, 9, 30)
    render(<DatePicker withTime value={v} onChange={(x) => changes.push(x)} data-testid="dt" />)
    expect(screen.getByTestId('dt').textContent).toContain('10 Jun 2026 09:30')
    fireEvent.click(screen.getByTestId('dt'))
    const content = await screen.findByTestId('dt-content')
    fireEvent.change(within(content).getByTestId('dt-time-input'), { target: { value: '18:05' } })
    expect(ymd(changes.at(-1)!)).toBe('2026-6-10-18-5')
    fireEvent.click(dayButton(content, 20))
    await waitFor(() => expect(ymd(changes.at(-1)!)).toBe('2026-6-20-9-30'))
  })

  test('minDate/maxDate menonaktifkan hari di luar rentang; clearable=false tanpa tombol ×', async () => {
    render(<DatePicker value={new Date(2026, 0, 10)} onChange={() => {}} minDate={new Date(2026, 0, 5)} maxDate={new Date(2026, 0, 20)} clearable={false} />)
    expect(screen.queryByTestId('date-picker-clear')).toBeNull()
    fireEvent.click(screen.getByTestId('date-picker'))
    const content = await screen.findByTestId('date-picker-content')
    const disabled = within(content).getAllByRole('button').filter((b) => b.getAttribute('aria-disabled') === 'true' || (b as HTMLButtonElement).disabled)
    expect(disabled.length).toBeGreaterThan(0)
  })
})

describe('DateRangePicker', () => {
  test('preset mengisi rentang; pilih dua hari → from/to; label "a – b"; bersihkan', async () => {
    const changes: ({ from: Date | null; to: Date | null } | null)[] = []
    const { rerender } = render(<RangeHarness onChange={(v) => changes.push(v)} />)
    fireEvent.click(screen.getByTestId('date-range-picker'))
    const content = await screen.findByTestId('date-range-picker-content')
    // Pilih tanggal awal dulu (rentang kosong → from saja)
    fireEvent.click(dayButton(content, 3))
    await waitFor(() => expect(changes.at(-1)?.from?.getDate()).toBe(3))
    expect([null, 3]).toContain(changes.at(-1)?.to?.getDate() ?? null)
    fireEvent.click(dayButton(content, 9))
    await waitFor(() => expect(changes.at(-1)?.to?.getDate()).toBe(9))
    expect(changes.at(-1)?.from?.getDate()).toBe(3)

    const presets = within(screen.getByTestId('date-range-picker-presets'))
    expect(presets.getAllByRole('button').length).toBe(DEFAULT_RANGE_PRESETS.length)
    fireEvent.click(presets.getByText('7 hari terakhir'))
    const r = changes.at(-1)!
    expect(r?.from && r?.to && (r.to.getTime() - r.from.getTime()) / 86_400_000).toBe(6)

    rerender(<DateRangePicker value={{ from: new Date(2026, 0, 3), to: new Date(2026, 0, 9) }} onChange={(v) => changes.push(v)} />)
    expect(screen.getByTestId('date-range-picker').textContent).toContain('3 Jan 2026 – 9 Jan 2026')
    fireEvent.click(screen.getByTestId('date-range-picker-clear'))
    expect(changes.at(-1)).toBeNull()
  })

  test('presets=false menyembunyikan panel preset', async () => {
    render(<DateRangePicker value={{ from: new Date(2026, 0, 3), to: null }} onChange={() => {}} presets={false} numberOfMonths={1} />)
    expect(screen.getByTestId('date-range-picker').textContent).toContain('3 Jan 2026')
    fireEvent.click(screen.getByTestId('date-range-picker'))
    await screen.findByTestId('date-range-picker-content')
    expect(screen.queryByTestId('date-range-picker-presets')).toBeNull()
  })
})

describe('DateRangePicker — preset & deselect', () => {
  test('setiap preset menghasilkan rentang valid (from ≤ to, tanpa jam)', () => {
    for (const p of DEFAULT_RANGE_PRESETS) {
      const r = p.range()
      expect(r.from && r.to && r.from.getTime() <= r.to.getTime(), p.label).toBe(true)
      expect([r.from!.getHours(), r.from!.getMinutes()]).toEqual([0, 0])
    }
  })

  test('klik hari yang sudah terpilih (single) → nilai dikosongkan', async () => {
    const changes: (Date | null)[] = []
    const v = new Date(2026, 3, 15)
    render(<DatePicker value={v} onChange={(x) => changes.push(x)} />)
    fireEvent.click(screen.getByTestId('date-picker'))
    const content = await screen.findByTestId('date-picker-content')
    fireEvent.click(dayButton(content, 15))
    await waitFor(() => expect(changes.length).toBe(1))
    expect(changes[0]).toBeNull()
  })
})
