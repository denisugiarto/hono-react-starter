import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { apiMock, fetchCalls } from '../mocks/api.ts'
import { asUser } from '../mocks/auth-client.ts'
import { renderAt, typeInto, setupEach, teardownEach } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

describe('Notes', () => {
  test('halaman: judul, form, daftar dari API', async () => {
    asUser()
    renderAt('/notes')
    expect(document.title).toBe('Catatan · Hono React Starter')
    expect(screen.getByRole('status', { name: 'Memuat catatan…' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Catatan pertama')).toBeTruthy())
    expect(screen.getByText('isi')).toBeTruthy()
  })

  test('tambah: validasi judul, lalu POST + toast + daftar diperbarui', async () => {
    asUser()
    renderAt('/notes')
    await screen.findByText('Catatan pertama')

    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }))
    await waitFor(() => expect(screen.getByText('title wajib diisi')).toBeTruthy())

    typeInto(screen.getByLabelText('Judul'), 'Catatan baru')
    typeInto(screen.getByLabelText('Isi (opsional)'), 'detail')
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }))
    await waitFor(() => expect(screen.getByText('Catatan baru')).toBeTruthy())
    expect(await screen.findByText('Catatan dibuat')).toBeTruthy()
    expect(fetchCalls.find((c) => c.method === 'POST')?.body).toEqual({ title: 'Catatan baru', content: 'detail' })
  })

  test('tambah gagal → ErrorMessage', async () => {
    asUser()
    apiMock.fail.create = true
    renderAt('/notes')
    typeInto(screen.getByLabelText('Judul'), 'X')
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }))
    await waitFor(() => expect(screen.getByText('Gagal simpan')).toBeTruthy())
  })

  test('toggle selesai → PATCH {done:true}; judul dicoret', async () => {
    asUser()
    renderAt('/notes')
    fireEvent.click(await screen.findByLabelText('Tandai "Catatan pertama" selesai'))
    await waitFor(() => expect(fetchCalls.find((c) => c.method === 'PATCH')?.body).toEqual({ done: true }))
    await waitFor(() => expect(screen.getByText('Catatan pertama').className).toContain('line-through'))
  })

  test('hapus → DELETE, toast, daftar kosong', async () => {
    asUser()
    renderAt('/notes')
    fireEvent.click(await screen.findByLabelText('Hapus "Catatan pertama"'))
    await waitFor(() => expect(screen.getByText('Belum ada catatan')).toBeTruthy())
    expect(fetchCalls.some((c) => c.method === 'DELETE')).toBe(true)
    expect(await screen.findByText('Catatan dihapus')).toBeTruthy()
  })

  test('toggle gagal → optimistic di-rollback (coretan hilang) + toast error', async () => {
    asUser()
    apiMock.fail.update = true
    renderAt('/notes')
    fireEvent.click(await screen.findByLabelText('Tandai "Catatan pertama" selesai'))
    expect((await screen.findAllByText('Gagal mengubah')).length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.getByText('Catatan pertama').className).not.toContain('line-through'))
    expect(apiMock.notes[0]!.done).toBe(false)
  })

  test('hapus gagal → item kembali + toast error', async () => {
    asUser()
    apiMock.fail.delete = true
    renderAt('/notes')
    fireEvent.click(await screen.findByLabelText('Hapus "Catatan pertama"'))
    expect((await screen.findAllByText('Gagal menghapus')).length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.getByText('Catatan pertama')).toBeTruthy())
    expect(screen.queryByText('Belum ada catatan')).toBeNull()
  })

  test('daftar gagal dimuat → pesan error', async () => {
    asUser()
    apiMock.fail.notes = true
    renderAt('/notes')
    await waitFor(() => expect(screen.getByText('DB mati')).toBeTruthy())
  })
})
