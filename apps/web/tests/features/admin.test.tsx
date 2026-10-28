import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { apiMock } from '../mocks/api.ts'
import { asAdmin, asUser } from '../mocks/auth-client.ts'
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

describe('Admin — AuditLogsTable', () => {
  test('tabel, badge status, metadata ringkas, muat lebih banyak (cursor), filter', async () => {
    asAdmin()
    renderAt('/admin/audit-logs')
    expect(document.title).toContain('Audit log')
    expect(screen.getByRole('status', { name: 'Memuat audit log…' })).toBeTruthy()
    await waitFor(() => expect(screen.getAllByText('auth.sign_in').length).toBeGreaterThan(0))
    expect(screen.getByText('admin.set_role')).toBeTruthy()
    expect(screen.getByText('email=x@test.local · status=401')).toBeTruthy()
    expect(screen.getByText('anonim')).toBeTruthy()
    expect(screen.getByText('user u3')).toBeTruthy()
    expect(screen.getAllByText('berhasil').length).toBe(2)

    fireEvent.click(screen.getByRole('button', { name: 'Muat lebih banyak' }))
    await waitFor(() => expect(screen.getByText('gagal')).toBeTruthy())
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Muat lebih banyak' })).toBeNull())

    fireEvent.change(screen.getByLabelText('Aksi'), { target: { value: 'admin.' } })
    await waitFor(() => expect(screen.queryByText('auth.sign_in')).toBeNull())
    fireEvent.change(screen.getByLabelText('Aksi'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'false' } })
    await waitFor(() => expect(screen.getByText('gagal')).toBeTruthy())
    expect(screen.queryByText('berhasil')).toBeNull()
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Muat ulang' }))
    await waitFor(() => expect(screen.getAllByText('auth.sign_in').length).toBeGreaterThan(0))
  })

  test('kosong → EmptyState; gagal → ErrorMessage; user biasa → 403', async () => {
    asAdmin()
    apiMock.auditTotal = 0
    const first = renderAt('/admin/audit-logs')
    await waitFor(() => expect(screen.getByText('Belum ada entri audit')).toBeTruthy())
    first.unmount()

    apiMock.fail.audit = true
    const second = renderAt('/admin/audit-logs')
    await waitFor(() => expect(screen.getByText('Audit ditolak')).toBeTruthy())
    second.unmount()

    asUser()
    renderAt('/admin/audit-logs')
    expect(screen.getByText(/403 — Akses ditolak/)).toBeTruthy()
  })
})
