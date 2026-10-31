import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { screen, waitFor, within } from '@testing-library/react'
import { asAdmin, asUser } from '../mocks/auth-client.ts'
import { renderAt, setupEach, teardownEach } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

const sidebarLinks = () =>
  within(screen.getByTestId('app-sidebar'))
    .getAllByTestId('sidebar-link')
    .map((a) => a.getAttribute('data-to'))

describe('SidebarLayout (Pengaturan & Admin)', () => {
  test('user: grup Umum & Akun tampil, grup Admin disembunyikan; link aktif aria-current', async () => {
    asUser()
    renderAt('/settings/security')
    await waitFor(() => expect(screen.getByTestId('app-sidebar')).toBeTruthy())
    const sidebar = within(screen.getByTestId('app-sidebar'))
    expect(sidebar.getByText('Umum')).toBeTruthy()
    expect(sidebar.getByText('Akun')).toBeTruthy()
    expect(sidebar.queryByText('Admin')).toBeNull()
    expect(sidebarLinks()).toEqual(['/', '/notes', '/settings/security', '/settings/api-token'])
    const active = sidebar.getAllByTestId('sidebar-link').find((a) => a.getAttribute('aria-current') === 'page')
    expect(active?.getAttribute('data-to')).toBe('/settings/security')
    // Versi mobile: deretan tautan yang sama
    const sectionNav = within(screen.getByTestId('section-nav'))
    expect(sectionNav.getByRole('link', { name: 'Keamanan' })).toBeTruthy()
  })

  test('admin: grup Admin tampil dengan Pengguna & Audit log', async () => {
    asAdmin()
    renderAt('/admin/users')
    await waitFor(() => expect(screen.getByTestId('app-sidebar')).toBeTruthy())
    expect(sidebarLinks()).toContain('/admin/users')
    expect(sidebarLinks()).toContain('/admin/audit-logs')
    expect(within(screen.getByTestId('app-sidebar')).getByText('Admin')).toBeTruthy()
  })

  test('halaman catatan & beranda tidak memakai sidebar', async () => {
    asUser()
    renderAt('/notes')
    await waitFor(() => expect(screen.getByText('Catatan', { selector: 'h1' })).toBeTruthy())
    expect(screen.queryByTestId('app-sidebar')).toBeNull()
  })
})
