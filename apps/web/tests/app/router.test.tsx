import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { RouteObject } from 'react-router'
import { asAdmin, asGuest, asUser, sessionState } from '../mocks/auth-client.ts'
import { renderAt, routes, setupEach, teardownEach } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

describe('router — halaman publik', () => {
  test('/ → beranda: judul, stack, kartu health & hello; title dokumen', async () => {
    asGuest()
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Hono React Starter' })).toBeTruthy()
    expect(screen.getByText('React Router')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Masuk untuk mulai' })).toBeTruthy()
    await waitFor(() => expect(screen.getAllByText('ok').length).toBeGreaterThan(0))
    expect(document.title).toBe('Hono React Starter')
  })

  test('beranda saat login → tombol "Buka catatan"', () => {
    asUser()
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Buka catatan' })).toBeTruthy()
  })

  test('path tak dikenal → 404 + tombol ke beranda', async () => {
    asGuest()
    const { router } = renderAt('/tidak/ada')
    expect(screen.getByText(/404 — Halaman tidak ditemukan/)).toBeTruthy()
    expect(document.title).toContain('Halaman tidak ditemukan')
    fireEvent.click(screen.getByRole('link', { name: 'Ke beranda' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})

describe('router — guard RequireAuth', () => {
  test('/notes tanpa login → redirect ke /login dengan state.from', async () => {
    asGuest()
    const { router } = renderAt('/notes?x=1')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.state).toEqual({ from: '/notes?x=1' })
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeTruthy()
  })

  test('sesi masih dimuat → skeleton "Memeriksa sesi…", tidak redirect', () => {
    asGuest()
    sessionState.isPending = true
    const { router } = renderAt('/notes')
    expect(screen.getByRole('status', { name: 'Memeriksa sesi…' })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/notes')
  })

  test('/login saat sudah login → diarahkan ke /notes', async () => {
    asUser()
    const { router } = renderAt('/login')
    await waitFor(() => expect(router.state.location.pathname).toBe('/notes'))
  })
})

describe('router — guard RequirePermission', () => {
  test('user biasa buka /admin/users → 403', () => {
    asUser()
    renderAt('/admin/users')
    expect(screen.getByText(/403 — Akses ditolak/)).toBeTruthy()
    expect(document.title).toContain('Akses ditolak')
  })

  test('admin buka /admin/users → tabel pengguna', async () => {
    asAdmin()
    renderAt('/admin/users')
    expect(screen.getByRole('heading', { name: 'Pengguna' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Nakal')).toBeTruthy())
  })
})

describe('router — errorElement', () => {
  test('error render di bawah root → RouteErrorPage', () => {
    asGuest()
    const Boom = () => {
      throw new Error('meledak')
    }
    const root = {
      ...routes[0]!,
      children: [...(routes[0]!.children ?? []), { path: 'boom', element: <Boom /> }],
    } as RouteObject
    const errSpy = console.error
    console.error = () => {}
    try {
      renderAt('/boom', [root])
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText('Terjadi kesalahan')).toBeTruthy()
      expect(screen.getByText('meledak')).toBeTruthy()
    } finally {
      console.error = errSpy
    }
  })

  test('404 dari router (tanpa route) → status + statusText', () => {
    asGuest()
    const root = { ...routes[0]!, children: [] } as RouteObject
    renderAt('/apa-saja', [root])
    expect(screen.getByText(/404 — Not Found/)).toBeTruthy()
  })
})
