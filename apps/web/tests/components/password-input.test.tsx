import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PasswordInput } from '../../src/components/common/password-input.tsx'

afterEach(cleanup)

describe('PasswordInput', () => {
  test('tersembunyi secara default; tombol menampilkan lalu menyembunyikan lagi (aria-pressed & label berubah)', () => {
    render(<PasswordInput id="pw" data-testid="pw" placeholder="rahasia" />)
    const input = screen.getByTestId('pw') as HTMLInputElement
    const toggle = screen.getByTestId('pw-toggle')
    expect(input.type).toBe('password')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(toggle.getAttribute('aria-label')).toBe('Tampilkan password')
    expect(toggle.getAttribute('tabindex')).toBe('-1')

    fireEvent.click(toggle)
    expect(input.type).toBe('text')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(toggle.getAttribute('aria-label')).toBe('Sembunyikan password')

    fireEvent.click(toggle)
    expect(input.type).toBe('password')
  })

  test('defaultVisible, disabled ikut ke tombol, data-testid default "password"', () => {
    render(<PasswordInput defaultVisible disabled />)
    const toggle = screen.getByTestId('password-toggle') as HTMLButtonElement
    expect(toggle.disabled).toBe(true)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    const input = document.querySelector('input') as HTMLInputElement
    expect(input.type).toBe('text')
    expect(input.disabled).toBe(true)
  })

  test('nilai yang diketik tetap saat mode berganti', () => {
    render(<PasswordInput data-testid="pw" />)
    const input = screen.getByTestId('pw') as HTMLInputElement
    fireEvent.input(input, { target: { value: 'abc123' } })
    fireEvent.click(screen.getByTestId('pw-toggle'))
    expect(input.value).toBe('abc123')
  })
})
