import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { readSidebarOpen } from '../../src/lib/sidebar-state.ts'
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

  test('tombol ciutkan: label disembunyikan (sr-only), data-state collapsed, lalu diperluas lagi', async () => {
    asUser()
    renderAt('/settings/security')
    await waitFor(() => expect(screen.getByTestId('app-sidebar')).toBeTruthy())
    const sidebar = screen.getByTestId('app-sidebar')
    expect(sidebar.getAttribute('data-state')).toBe('expanded')
    const toggle = screen.getByTestId('sidebar-collapse')
    expect(toggle.getAttribute('aria-label')).toBe('Ciutkan sidebar')

    fireEvent.click(toggle)
    expect(sidebar.getAttribute('data-state')).toBe('collapsed')
    expect(sidebar.className).toContain('w-13')
    expect(within(sidebar).getByText('Keamanan').className).toContain('sr-only')
    expect(screen.getByTestId('sidebar-collapse').getAttribute('aria-label')).toBe('Perluas sidebar')
    expect(document.cookie).toContain('sidebar_state=false')

    fireEvent.click(screen.getByTestId('sidebar-collapse'))
    expect(sidebar.getAttribute('data-state')).toBe('expanded')
    expect(within(sidebar).getByText('Keamanan').className).not.toContain('sr-only')
    document.cookie = 'sidebar_state=; max-age=0; path=/'
  })

  test('readSidebarOpen membaca cookie sidebar_state (default terbuka)', () => {
    expect(readSidebarOpen('')).toBe(true)
    expect(readSidebarOpen('a=1; sidebar_state=false; b=2')).toBe(false)
    expect(readSidebarOpen('sidebar_state=true')).toBe(true)
    expect(typeof readSidebarOpen()).toBe('boolean')
  })
})
