import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { screen, waitFor } from '@testing-library/react'
import { apiMock } from '../mocks/api.ts'
import { asAdmin } from '../mocks/auth-client.ts'
import { renderAt, setupEach, teardownEach } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

describe('Admin — UsersTable', () => {
  test('daftar user dengan badge role & status', async () => {
    asAdmin()
    renderAt('/admin/users')
    expect(screen.getByRole('status', { name: 'Memuat pengguna…' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Nakal')).toBeTruthy())
    expect(screen.getByText('banned')).toBeTruthy()
    expect(screen.getByText('aktif')).toBeTruthy()
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0)
    expect(document.title).toContain('Pengguna')
  })

  test('endpoint gagal → error tampil', async () => {
    asAdmin()
    apiMock.fail.admin = true
    renderAt('/admin/users')
    await waitFor(() => expect(screen.getByText('Forbidden')).toBeTruthy())
  })

  test('daftar kosong → EmptyState', async () => {
    asAdmin()
    const base = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url === '/api/admin/users') {
        return new Response(JSON.stringify({ success: true, data: [] }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return base(input, init)
    }) as typeof fetch
    renderAt('/admin/users')
    await waitFor(() => expect(screen.getByText('Belum ada pengguna')).toBeTruthy())
  })
})
