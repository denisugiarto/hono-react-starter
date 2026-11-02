import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { authCalls, authMock, asAdmin } from '../mocks/auth-client.ts'
import { renderAt, setupEach, teardownEach, typeInto } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

const rowOf = (email: string) => screen.getAllByTestId('user-row').find((r) => r.dataset.email === email)!
const openActions = async (email: string) => {
  fireEvent.click(within(rowOf(email)).getByTestId('user-actions'))
  return screen.findByRole('menu')
}

describe('Admin — aksi pengguna', () => {
  test('aksi pada akun sendiri dinonaktifkan; akun lain punya menu', async () => {
    asAdmin()
    renderAt('/admin/users')
    await screen.findByText('Nakal')
    expect((within(rowOf('root@x')).getByTestId('user-actions') as HTMLButtonElement).disabled).toBe(true)
    expect((within(rowOf('nakal@x')).getByTestId('user-actions') as HTMLButtonElement).disabled).toBe(false)
  })

  test('ubah role: dialog memuat daftar role, pilih role lain → adminApi.setRole, toast, dialog tertutup', async () => {
    asAdmin()
    renderAt('/admin/users')
    await screen.findByText('Nakal')
    const menu = await openActions('nakal@x')
    fireEvent.click(within(menu).getByText('Ubah role'))
    const dialog = await screen.findByTestId('user-role-dialog')
    const submit = within(dialog).getByTestId('user-role-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true) // role sama
    fireEvent.click(within(dialog).getByTestId('user-role-select'))
    fireEvent.click(await screen.findByText('viewer'))
    await waitFor(() => expect(submit.disabled).toBe(false))
    fireEvent.click(submit)
    await waitFor(() => expect(authCalls.some((c) => c.kind === 'admin.setRole')).toBe(true))
    expect(authCalls.find((c) => c.kind === 'admin.setRole')?.payload).toEqual({ userId: 'u3', role: 'viewer' })
    await waitFor(() => expect(screen.getByText(/Role pengguna diubah/)).toBeTruthy())
    await waitFor(() => expect(screen.queryByTestId('user-role-dialog')).toBeNull())
  })

  test('blokir dengan alasan → adminApi.banUser; akun terblokir menampilkan "Cabut blokir" → unbanUser', async () => {
    asAdmin()
    renderAt('/admin/users')
    await screen.findByText('Nakal')
    // root@x aktif tetapi itu akun sendiri; pakai nakal@x (banned) untuk unban, lalu blokir lewat akun lain tidak ada → uji ban pada nakal setelah unban
    let menu = await openActions('nakal@x')
    fireEvent.click(within(menu).getByText('Cabut blokir'))
    await waitFor(() => expect(authCalls.some((c) => c.kind === 'admin.unbanUser')).toBe(true))
    await waitFor(() => expect(screen.getByText('Blokir dicabut')).toBeTruthy())

    // simulasikan data server sudah berubah: nakal aktif → menu menawarkan Blokir
    const { apiMock } = await import('../mocks/api.ts')
    apiMock.fail.admin = false
    teardownEach()
    setupEach()
    asAdmin()
    // ganti daftar user mock: nakal aktif
    const mod = await import('../mocks/api.ts')
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/admin/users') return mod.jsonResponse([{ id: 'u3', name: 'Nakal', email: 'nakal@x', role: 'user', banned: false, createdAt: '' }])
      return originalFetch(input, init)
    }) as typeof fetch
    renderAt('/admin/users')
    await screen.findByText('Nakal')
    menu = await openActions('nakal@x')
    fireEvent.click(within(menu).getByText('Blokir'))
    const dialog = await screen.findByTestId('user-ban-dialog')
    typeInto(within(dialog).getByTestId('user-ban-reason'), 'spam')
    fireEvent.click(within(dialog).getByTestId('user-ban-submit'))
    await waitFor(() => expect(authCalls.some((c) => c.kind === 'admin.banUser')).toBe(true))
    expect(authCalls.find((c) => c.kind === 'admin.banUser')?.payload).toEqual({ userId: 'u3', banReason: 'spam' })
    globalThis.fetch = originalFetch
  })

  test('cabut semua sesi & hapus (konfirmasi); error Better Auth → toast error', async () => {
    asAdmin()
    renderAt('/admin/users')
    await screen.findByText('Nakal')
    let menu = await openActions('nakal@x')
    fireEvent.click(within(menu).getByText('Cabut semua sesi'))
    await waitFor(() => expect(authCalls.some((c) => c.kind === 'admin.revokeUserSessions')).toBe(true))

    authMock.responses['admin.removeUser'] = { error: { message: 'Tidak boleh menghapus admin lain' } }
    menu = await openActions('nakal@x')
    fireEvent.click(within(menu).getByText('Hapus pengguna'))
    fireEvent.click(await screen.findByTestId('user-remove-confirm'))
    await waitFor(() => expect(screen.getByText('Tidak boleh menghapus admin lain')).toBeTruthy())
    expect(authCalls.find((c) => c.kind === 'admin.removeUser')?.payload).toEqual({ userId: 'u3' })
  })

  test('tambah pengguna: tombol aktif setelah form valid → adminApi.createUser', async () => {
    asAdmin()
    renderAt('/admin/users')
    await screen.findByText('Nakal')
    fireEvent.click(screen.getByTestId('user-create'))
    const dialog = await screen.findByTestId('user-create-dialog')
    const submit = within(dialog).getByTestId('user-create-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    typeInto(within(dialog).getByTestId('user-create-name'), 'Citra')
    typeInto(within(dialog).getByTestId('user-create-email'), 'citra@test.local')
    typeInto(within(dialog).getByTestId('user-create-password'), 'RahasiaKuat!9')
    await waitFor(() => expect(submit.disabled).toBe(false))
    fireEvent.click(submit)
    await waitFor(() => expect(authCalls.some((c) => c.kind === 'admin.createUser')).toBe(true))
    expect(authCalls.find((c) => c.kind === 'admin.createUser')?.payload).toEqual({ name: 'Citra', email: 'citra@test.local', password: 'RahasiaKuat!9', role: 'user' })
    await waitFor(() => expect(screen.getByText('Pengguna dibuat')).toBeTruthy())
  })
})
