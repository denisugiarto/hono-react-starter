import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { apiMock, fetchCalls } from '../mocks/api.ts'
import { asAdmin, asUser } from '../mocks/auth-client.ts'
import { renderAt, setupEach, teardownEach, typeInto } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

describe('Admin — Role & permission', () => {
  test('daftar role: badge sistem, jumlah permission & pengguna; hapus dinonaktifkan untuk sistem/dipakai', async () => {
    asAdmin()
    renderAt('/admin/roles')
    await waitFor(() => expect(screen.getAllByTestId('role-row').length).toBe(3))
    const adminRow = screen.getAllByTestId('role-row').find((r) => r.dataset.role === 'admin')!
    expect(within(adminRow).getByText('sistem')).toBeTruthy()
    expect((within(adminRow).getByTestId('role-delete') as HTMLButtonElement).disabled).toBe(true)
    const viewerRow = screen.getAllByTestId('role-row').find((r) => r.dataset.role === 'viewer')!
    expect((within(viewerRow).getByTestId('role-delete') as HTMLButtonElement).disabled).toBe(false)
    expect(within(viewerRow).getByText('1')).toBeTruthy() // 1 permission (note:read)
    expect(document.title).toContain('Role & permission')
  })

  test('buat role lewat dialog + matriks → POST dengan permission kanonik, toast, baris baru', async () => {
    asAdmin()
    renderAt('/admin/roles')
    await screen.findAllByTestId('role-row')
    fireEvent.click(screen.getByTestId('role-create'))
    const dialog = await screen.findByTestId('role-dialog')
    typeInto(within(dialog).getByTestId('role-name'), 'Editor')
    typeInto(within(dialog).getByTestId('role-description'), 'Bisa mengubah catatan')
    fireEvent.click(within(dialog).getByTestId('perm-note-all'))
    fireEvent.click(within(dialog).getByTestId('perm-note-delete')) // lepas satu
    fireEvent.click(within(dialog).getByTestId('perm-audit-list'))
    fireEvent.click(within(dialog).getByTestId('role-submit'))
    await waitFor(() => expect(fetchCalls.some((c) => c.method === 'POST' && c.url === '/api/admin/roles')).toBe(true))
    const post = fetchCalls.find((c) => c.method === 'POST' && c.url === '/api/admin/roles')!
    expect(post.body).toEqual({ name: 'editor', description: 'Bisa mengubah catatan', permissions: { note: ['create', 'read', 'update'], audit: ['list'] } })
    await waitFor(() => expect(screen.getByText('Role "editor" dibuat')).toBeTruthy())
    await waitFor(() => expect(screen.getAllByTestId('role-row').length).toBe(4))
  })

  test('validasi nama di klien → pesan error, tanpa request', async () => {
    asAdmin()
    renderAt('/admin/roles')
    await screen.findAllByTestId('role-row')
    fireEvent.click(screen.getByTestId('role-create'))
    const dialog = await screen.findByTestId('role-dialog')
    typeInto(within(dialog).getByTestId('role-name'), 'x')
    fireEvent.click(within(dialog).getByTestId('role-submit'))
    expect(await within(dialog).findByText(/Nama role/)).toBeTruthy()
    expect(fetchCalls.some((c) => c.method === 'POST')).toBe(false)
  })

  test('ubah role: nama tidak bisa diganti, matriks terisi, PATCH hanya field role', async () => {
    asAdmin()
    renderAt('/admin/roles')
    await screen.findAllByTestId('role-row')
    const viewerRow = screen.getAllByTestId('role-row').find((r) => r.dataset.role === 'viewer')!
    fireEvent.click(within(viewerRow).getByTestId('role-edit'))
    const dialog = await screen.findByTestId('role-dialog')
    expect(within(dialog).queryByTestId('role-name')).toBeNull()
    expect(within(dialog).getByTestId('perm-note-read').getAttribute('aria-checked')).toBe('true')
    fireEvent.click(within(dialog).getByTestId('perm-note-update'))
    fireEvent.click(within(dialog).getByTestId('role-submit'))
    await waitFor(() => expect(fetchCalls.some((c) => c.method === 'PATCH')).toBe(true))
    const patch = fetchCalls.find((c) => c.method === 'PATCH')!
    expect(patch.url).toBe('/api/admin/roles/viewer')
    expect(patch.body).toEqual({ description: 'Hanya baca', permissions: { note: ['read', 'update'] } })
    await waitFor(() => expect(screen.getByText('Role disimpan')).toBeTruthy())
  })

  test('role admin hanya bisa dilihat (matriks readOnly, tanpa tombol simpan)', async () => {
    asAdmin()
    renderAt('/admin/roles')
    await screen.findAllByTestId('role-row')
    const adminRow = screen.getAllByTestId('role-row').find((r) => r.dataset.role === 'admin')!
    fireEvent.click(within(adminRow).getByTestId('role-edit'))
    const dialog = await screen.findByTestId('role-dialog')
    expect(within(dialog).queryByTestId('role-submit')).toBeNull()
    const locked = within(dialog).getByTestId('perm-note-read')
    expect(locked.hasAttribute('data-disabled') || locked.getAttribute('aria-disabled') === 'true' || (locked as HTMLButtonElement).disabled).toBe(true)
    expect(within(dialog).getByText(/tidak bisa diubah/)).toBeTruthy()
  })

  test('hapus role: konfirmasi → DELETE; server menolak → toast error', async () => {
    asAdmin()
    renderAt('/admin/roles')
    await screen.findAllByTestId('role-row')
    const viewerRow = screen.getAllByTestId('role-row').find((r) => r.dataset.role === 'viewer')!
    fireEvent.click(within(viewerRow).getByTestId('role-delete'))
    fireEvent.click(await screen.findByTestId('role-delete-confirm'))
    await waitFor(() => expect(fetchCalls.some((c) => c.method === 'DELETE' && c.url === '/api/admin/roles/viewer')).toBe(true))
    await waitFor(() => expect(screen.getAllByTestId('role-row').length).toBe(2))

    apiMock.fail.roleWrite = true
    apiMock.roles = [...apiMock.roles, { name: 'temp', description: '', permissions: {}, system: false, usersCount: 0 }]
    fireEvent.click(screen.getByTestId('role-create'))
    const dialog = await screen.findByTestId('role-dialog')
    typeInto(within(dialog).getByTestId('role-name'), 'temp')
    fireEvent.click(within(dialog).getByTestId('role-submit'))
    await waitFor(() => expect(screen.getByText('Role sudah ada')).toBeTruthy())
  })

  test('gagal memuat → pesan error; user biasa → 403; menu & sidebar admin punya tautan', async () => {
    asAdmin()
    apiMock.fail.roles = true
    renderAt('/admin/roles')
    await waitFor(() => expect(screen.getByText('Role ditolak')).toBeTruthy())
    teardownEach()
    setupEach()
    asUser()
    renderAt('/admin/roles')
    expect(screen.getByText(/403 — Akses ditolak/)).toBeTruthy()
    teardownEach()
    setupEach()
    asAdmin()
    renderAt('/admin/users')
    await waitFor(() => expect(screen.getAllByRole('link', { name: /Role & permission/ }).length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'Menu pengguna' }))
    expect(await screen.findByTestId('user-menu-roles')).toBeTruthy()
  })
})

describe('Admin — Role & permission (gagal simpan)', () => {
  test('PATCH ditolak server → toast error, dialog tetap terbuka', async () => {
    asAdmin()
    apiMock.fail.roleWrite = true
    renderAt('/admin/roles')
    await screen.findAllByTestId('role-row')
    const viewerRow = screen.getAllByTestId('role-row').find((r) => r.dataset.role === 'viewer')!
    fireEvent.click(within(viewerRow).getByTestId('role-edit'))
    const dialog = await screen.findByTestId('role-dialog')
    fireEvent.click(within(dialog).getByTestId('perm-note-update'))
    fireEvent.click(within(dialog).getByTestId('role-submit'))
    await waitFor(() => expect(screen.getByText('Role admin tidak bisa diubah')).toBeTruthy())
    expect(screen.getByTestId('role-dialog')).toBeTruthy()
  })
})
