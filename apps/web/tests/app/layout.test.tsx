import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { asAdmin, asGuest, asUser, authCalls, sessionState } from '../mocks/auth-client.ts'
import { renderAt, setupEach, teardownEach } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

const mainNav = () => within(screen.getByRole('navigation', { name: 'Navigasi utama' }))

describe('layout — navigasi', () => {
  test('tamu: hanya Beranda + tombol Masuk', () => {
    asGuest()
    renderAt('/')
    const nav = mainNav()
    expect(nav.getByRole('link', { name: 'Beranda' })).toBeTruthy()
    expect(nav.queryByRole('link', { name: 'Catatan' })).toBeNull()
    expect(nav.queryByRole('link', { name: 'Pengguna' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Masuk' })).toBeTruthy()
  })

  test('user: Catatan tampil, Pengguna tidak; menu pengguna ada', () => {
    asUser()
    renderAt('/')
    const nav = mainNav()
    expect(nav.getByRole('link', { name: 'Catatan' })).toBeTruthy()
    expect(nav.queryByRole('link', { name: 'Pengguna' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Menu pengguna' })).toBeTruthy()
  })

  test('admin: Pengguna tampil; link aktif ditandai aria-current', async () => {
    asAdmin()
    const { router } = renderAt('/admin/users')
    const nav = mainNav()
    const link = nav.getByRole('link', { name: 'Pengguna' })
    expect(link.getAttribute('aria-current')).toBe('page')
    fireEvent.click(nav.getByRole('link', { name: 'Beranda' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  test('sesi dimuat → area akun berupa skeleton', () => {
    asGuest()
    sessionState.isPending = true
    renderAt('/')
    expect(screen.queryByRole('link', { name: 'Masuk' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Menu pengguna' })).toBeNull()
  })

  test('mobile: tombol menu membuka sheet berisi navigasi', async () => {
    asUser()
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'Buka menu' }))
    const dialog = await screen.findByRole('dialog')
    const nav = within(dialog).getByRole('navigation', { name: 'Navigasi mobile' })
    expect(within(nav).getByRole('link', { name: 'Catatan' })).toBeTruthy()
  })
})

describe('layout — menu pengguna', () => {
  test('membuka menu: identitas, pintasan, keluar → signOut + ke beranda', async () => {
    asAdmin()
    const { router } = renderAt('/notes')
    const trigger = screen.getByRole('button', { name: 'Menu pengguna' })
    expect(trigger.textContent).toContain('R') // inisial avatar
    fireEvent.click(trigger)
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('root@test.local')).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: /Pengguna/ })).toBeTruthy()
    fireEvent.click(within(menu).getByRole('menuitem', { name: /Keluar/ }))
    await waitFor(() => expect(authCalls.some((c) => c.kind === 'signOut')).toBe(true))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByText('Anda telah keluar')).toBeTruthy()
  })

  test('user biasa: tanpa pintasan Pengguna', async () => {
    asUser()
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'Menu pengguna' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: /Pengguna/ })).toBeNull()
    expect(within(menu).getByRole('menuitem', { name: /Token API/ })).toBeTruthy()
  })
})

describe('layout — tema', () => {
  test('toggle: light → dark (class html + localStorage) → light', () => {
    asGuest()
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'Ganti ke tema gelap' }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem('theme')).toBe('dark')
    fireEvent.click(screen.getByRole('button', { name: 'Ganti ke tema terang' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(window.localStorage.getItem('theme')).toBe('light')
  })

  test('tema tersimpan "dark" dipakai saat mount', () => {
    asGuest()
    window.localStorage.setItem('theme', 'dark')
    renderAt('/')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(screen.getByRole('button', { name: 'Ganti ke tema terang' })).toBeTruthy()
  })
})
