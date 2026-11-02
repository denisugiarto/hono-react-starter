import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { apiMock, fetchCalls } from '../mocks/api.ts'
import { asAdmin, asUser } from '../mocks/auth-client.ts'
import { renderAt, setupEach, teardownEach } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

describe('Admin — Pengaturan aplikasi', () => {
  test('memuat pengaturan, saklar mengikuti nilai server, provider & status tampil', async () => {
    asAdmin()
    renderAt('/admin/settings')
    expect(screen.getByRole('status', { name: 'Memuat pengaturan…' })).toBeTruthy()
    const toggle = await screen.findByTestId('settings-require-email-verification')
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByTestId('settings-mail-provider').textContent).toBe('memory')
    expect(screen.getByTestId('settings-updated').textContent).toContain('Belum pernah diubah')
    expect(document.title).toContain('Pengaturan aplikasi')
  })

  test('mengubah saklar → PATCH, toast pesan server, metadata terakhir diubah tampil', async () => {
    asAdmin()
    renderAt('/admin/settings')
    const toggle = await screen.findByTestId('settings-require-email-verification')
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'))
    const patch = fetchCalls.find((c) => c.method === 'PATCH' && c.url === '/api/admin/settings')
    expect(patch?.body).toEqual({ requireEmailVerification: true })
    await waitFor(() => expect(screen.getByTestId('settings-updated').textContent).toContain('oleh u2'))
    await waitFor(() => expect(screen.getByText('Pengaturan disimpan')).toBeTruthy())
  })

  test('infra belum siap → saklar dinonaktifkan dan peringatan tampil', async () => {
    asAdmin()
    apiMock.settings = { ...apiMock.settings, mailProvider: 'console', emailVerificationReady: false }
    renderAt('/admin/settings')
    const toggle = await screen.findByTestId('settings-require-email-verification')
    expect(toggle.hasAttribute('disabled') || toggle.getAttribute('aria-disabled') === 'true' || toggle.hasAttribute('data-disabled')).toBe(true)
    expect(screen.getByTestId('settings-not-ready')).toBeTruthy()
  })

  test('infra belum siap tetapi sudah aktif → saklar tetap bisa dimatikan', async () => {
    asAdmin()
    apiMock.settings = { ...apiMock.settings, requireEmailVerification: true, emailVerificationReady: false, mailProvider: 'console' }
    renderAt('/admin/settings')
    const toggle = await screen.findByTestId('settings-require-email-verification')
    expect(toggle.hasAttribute('disabled')).toBe(false)
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'))
  })

  test('server menolak (409) → toast error, nilai tidak berubah', async () => {
    asAdmin()
    apiMock.fail.settingsUpdate = true
    renderAt('/admin/settings')
    const toggle = await screen.findByTestId('settings-require-email-verification')
    fireEvent.click(toggle)
    await waitFor(() => expect(screen.getByText('Butuh provider email sungguhan')).toBeTruthy())
    expect(toggle.getAttribute('aria-checked')).toBe('false')
  })

  test('gagal memuat → pesan error; user biasa → 403; menu pengguna admin punya tautan', async () => {
    asAdmin()
    apiMock.fail.settings = true
    renderAt('/admin/settings')
    await waitFor(() => expect(screen.getByText('Pengaturan ditolak')).toBeTruthy())
    teardownEach()
    setupEach()
    asUser()
    renderAt('/admin/settings')
    expect(screen.getByText(/403 — Akses ditolak/)).toBeTruthy()
    teardownEach()
    setupEach()
    asAdmin()
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'Menu pengguna' }))
    expect(await screen.findByTestId('user-menu-settings')).toBeTruthy()
  })
})
