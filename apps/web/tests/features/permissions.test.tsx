import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { screen, waitFor } from '@testing-library/react'
import { apiMock } from '../mocks/api.ts'
import { asAdmin, asUser } from '../mocks/auth-client.ts'
import { renderAt, setupEach, teardownEach } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

describe('Permission efektif dari server (/api/me/permissions)', () => {
  test('role kustom: guard menunggu permission lalu mengizinkan sesuai server', async () => {
    asUser({ role: 'auditor' })
    apiMock.permissions.auditor = { audit: ['list'], note: ['read'] }
    renderAt('/admin/audit-logs')
    expect(screen.getByRole('status', { name: 'Memuat izin…' })).toBeTruthy()
    await waitFor(() => expect(screen.getByTestId('audit-table')).toBeTruthy())
    // nav: Audit tampil, Pengguna tidak
    expect(screen.queryByRole('link', { name: 'Pengguna' })).toBeNull()
  })

  test('role kustom tanpa permission → 403 setelah dimuat', async () => {
    asUser({ role: 'tamu' })
    apiMock.permissions.tamu = {}
    renderAt('/admin/audit-logs')
    await waitFor(() => expect(screen.getByText(/403 — Akses ditolak/)).toBeTruthy())
  })

  test('server mengubah permission role sistem → UI mengikuti server (admin tanpa audit:list → 403)', async () => {
    asAdmin()
    apiMock.permissions.admin = { user: ['list'] }
    renderAt('/admin/audit-logs')
    await waitFor(() => expect(screen.getByText(/403 — Akses ditolak/)).toBeTruthy())
  })

  test('endpoint permission gagal → fallback definisi default (admin tetap bisa)', async () => {
    asAdmin()
    apiMock.fail.permissions = true
    renderAt('/admin/users')
    await waitFor(() => expect(screen.getByText('Nakal')).toBeTruthy())
  })
})
