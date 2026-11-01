import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { UserIcon } from 'lucide-react'
import { Stepper, stepStatus } from '../../src/components/common/stepper.tsx'

afterEach(cleanup)
const steps = [{ label: 'Akun', icon: UserIcon }, { label: 'Profil', description: 'Data diri' }, { label: 'Selesai' }]

describe('Stepper', () => {
  test('status per langkah, aria-current, konektor selesai berwarna, klik langkah selesai', () => {
    const clicked: number[] = []
    render(<Stepper steps={steps} current={1} onStepClick={(i) => clicked.push(i)} />)
    const items = screen.getAllByTestId('stepper-step')
    expect(items.map((li) => li.getAttribute('data-status'))).toEqual(['complete', 'current', 'upcoming'])
    expect(items[1]!.getAttribute('aria-current')).toBe('step')
    expect(screen.getByText('Data diri')).toBeTruthy()
    const connectors = screen.getAllByTestId('stepper-connector')
    expect(connectors.length).toBe(2)
    expect(connectors[0]!.className).toContain('bg-primary')
    expect(connectors[1]!.className).not.toContain('bg-primary')
    // Hanya langkah selesai yang jadi tombol
    expect(items[0]!.querySelector('button')).toBeTruthy()
    expect(items[1]!.querySelector('button')).toBeNull()
    fireEvent.click(items[0]!.querySelector('button')!)
    expect(clicked).toEqual([0])
  })

  test('vertikal & semua selesai; stepStatus', () => {
    render(<Stepper steps={steps} current={3} orientation="vertical" />)
    expect(screen.getByTestId('stepper').getAttribute('data-orientation')).toBe('vertical')
    expect(screen.getAllByTestId('stepper-step').every((li) => li.getAttribute('data-status') === 'complete')).toBe(true)
    expect(stepStatus(0, 0)).toBe('current')
    expect(stepStatus(2, 0)).toBe('upcoming')
  })
})
