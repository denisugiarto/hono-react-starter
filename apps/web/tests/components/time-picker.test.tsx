import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TimePicker } from '../../src/components/common/time-picker.tsx'

afterEach(cleanup)

describe('TimePicker', () => {
  test('input type=time, step menit, onChange string atau null saat kosong', () => {
    const values: (string | null)[] = []
    const { rerender } = render(<TimePicker value={null} onChange={(v) => values.push(v)} minuteStep={15} />)
    const input = screen.getByTestId('time-picker-input') as HTMLInputElement
    expect(input.type).toBe('time')
    expect(input.step).toBe('900')
    fireEvent.change(input, { target: { value: '09:30' } })
    expect(values).toEqual(['09:30'])
    // Controlled: nilai dikosongkan setelah induk memberi value baru
    rerender(<TimePicker value="09:30" onChange={(v) => values.push(v)} minuteStep={15} />)
    fireEvent.change(screen.getByTestId('time-picker-input'), { target: { value: '' } })
    expect(values).toEqual(['09:30', null])
    rerender(<TimePicker value="10:00:05" onChange={() => {}} withSeconds disabled aria-label="Mulai" />)
    const i2 = screen.getByLabelText('Mulai') as HTMLInputElement
    expect(i2.step).toBe('1')
    expect(i2.disabled).toBe(true)
    expect(i2.value).toBe('10:00:05')
  })
})
