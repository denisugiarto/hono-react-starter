import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TagIcon } from 'lucide-react'
import { Chip } from '../../src/components/common/chip.tsx'

afterEach(cleanup)

describe('Chip', () => {
  test('statis: warna/tampilan lewat CSS variable, ikon, ukuran', () => {
    render(
      <Chip color="success" appearance="fill" size="lg" icon={TagIcon} data-testid="c">
        Aktif
      </Chip>,
    )
    const chip = screen.getByTestId('c')
    expect(chip.tagName).toBe('SPAN')
    expect(chip.className).toContain('[--chip:var(--success)]')
    expect(chip.className).toContain('bg-(--chip)')
    expect(chip.className).toContain('h-8')
    expect(chip.querySelector('svg')).toBeTruthy()
    expect(screen.queryByTestId('chip-remove')).toBeNull()
  })

  test('onRemove: tombol × dengan label, tidak memicu toggle induk; disabled', () => {
    const removed: string[] = []
    const toggled: boolean[] = []
    render(
      <Chip onRemove={() => removed.push('x')} onSelectedChange={(v) => toggled.push(v)} selected>
        Jakarta
      </Chip>,
    )
    const remove = screen.getByRole('button', { name: 'Hapus Jakarta' })
    fireEvent.click(remove)
    expect(removed).toEqual(['x'])
    expect(toggled).toEqual([])
    cleanup()
    render(
      <Chip onRemove={() => removed.push('y')} disabled>
        Nonaktif
      </Chip>,
    )
    expect((screen.getByTestId('chip-remove') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Nonaktif').closest('[data-slot=chip]')!.getAttribute('aria-disabled')).toBe('true')
  })

  test('filter toggle: tombol aria-pressed, centang saat terpilih, memanggil onSelectedChange', () => {
    const calls: boolean[] = []
    const { rerender } = render(
      <Chip selected={false} onSelectedChange={(v) => calls.push(v)}>
        Bandung
      </Chip>,
    )
    const btn = screen.getByRole('button', { name: 'Bandung' })
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.querySelector('svg')).toBeNull()
    fireEvent.click(btn)
    expect(calls).toEqual([true])
    rerender(
      <Chip selected onSelectedChange={(v) => calls.push(v)}>
        Bandung
      </Chip>,
    )
    expect(screen.getByRole('button', { name: 'Bandung' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Bandung' }).querySelector('svg')).toBeTruthy()
  })

  test('neutral outline/soft memakai warna border/muted bawaan', () => {
    render(
      <Chip appearance="outline" data-testid="o">
        Netral
      </Chip>,
    )
    expect(screen.getByTestId('o').className).toContain('border-border')
  })
})
