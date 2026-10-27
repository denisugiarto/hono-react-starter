import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../../src/components/error-boundary.tsx'

afterEach(cleanup)

function Boom(): never {
  throw new Error('boom')
}

describe('<ErrorBoundary>', () => {
  test('merender children saat tidak ada error', () => {
    render(
      <ErrorBoundary>
        <p>aman</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('aman')).toBeTruthy()
  })

  test('menampilkan pesan error saat child melempar', () => {
    const original = console.error
    console.error = () => {} // redam log error React di output test
    try {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      )
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText('Terjadi kesalahan')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Muat ulang' })).toBeTruthy()
    } finally {
      console.error = original
    }
  })
})
