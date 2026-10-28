import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { asGuest, asUser, authCalls, authMock } from '../mocks/auth-client.ts'
import { renderAt, typeInto, setupEach, teardownEach } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

describe('AuthForm — masuk', () => {
  test('validasi zod lalu signIn.email dipanggil, toast & navigasi ke from', async () => {
    asGuest()
    const { router } = renderAt('/notes')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))

    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    await waitFor(() => expect(screen.getByText('Email tidak valid')).toBeTruthy())
    expect(authCalls.length).toBe(0)

    typeInto(screen.getByLabelText('Email'), 'alice@test.local')
    typeInto(screen.getByLabelText('Password'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    await waitFor(() => expect(authCalls[0]?.kind).toBe('signIn'))
    // Tanpa callbackURL: bila dikirim, Better Auth membalas redirect dan browser pindah halaman
    expect(authCalls[0]?.payload).toEqual({ email: 'alice@test.local', password: 'password123' })
    expect(await screen.findByText('Selamat datang kembali')).toBeTruthy()
    // kembali ke tujuan semula (/notes); mock sesi masih tamu → dipantulkan lagi ke /login
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  test('error dari Better Auth ditampilkan; tanpa pesan → fallback', async () => {
    asGuest()
    authMock.result = { error: { message: 'Invalid email or password' } }
    renderAt('/login')
    typeInto(screen.getByLabelText('Email'), 'alice@test.local')
    typeInto(screen.getByLabelText('Password'), 'salah-sekali')
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    await waitFor(() => expect(screen.getByText('Invalid email or password')).toBeTruthy())

    authMock.result = { error: {} }
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    await waitFor(() => expect(screen.getByText('Gagal autentikasi')).toBeTruthy())
  })
})

describe('AuthForm — daftar', () => {
  test('pindah mode, nama wajib, signUp.email dipanggil, kembali ke mode masuk', async () => {
    asGuest()
    renderAt('/login')
    fireEvent.click(screen.getByRole('button', { name: 'Daftar akun baru' }))
    expect(screen.getByLabelText('Nama')).toBeTruthy()

    typeInto(screen.getByLabelText('Email'), 'bob@test.local')
    typeInto(screen.getByLabelText('Password'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    await waitFor(() => expect(screen.getByText('Nama wajib diisi')).toBeTruthy())

    // bolak-balik mode: error dibersihkan, field Nama hilang lalu muncul lagi
    fireEvent.click(screen.getByRole('button', { name: 'Sudah punya akun' }))
    expect(screen.queryByLabelText('Nama')).toBeNull()
    expect(screen.queryByText('Nama wajib diisi')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Daftar akun baru' }))

    typeInto(screen.getByLabelText('Nama'), 'Bob')
    typeInto(screen.getByLabelText('Email'), 'bob@test.local')
    typeInto(screen.getByLabelText('Password'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    await waitFor(() => expect(authCalls[0]?.kind).toBe('signUp'))
    expect(authCalls[0]?.payload).toEqual({
      email: 'bob@test.local',
      password: 'password123',
      name: 'Bob',
      callbackURL: 'http://localhost:5173/verify-email',
    })
    expect(await screen.findByText('Akun berhasil dibuat')).toBeTruthy()
  })
})

describe('ApiTokenCard', () => {
  test('Buat token → token tampil, lalu "Perbarui token"', async () => {
    asUser()
    renderAt('/settings/api-token')
    expect(document.title).toContain('Token API')
    fireEvent.click(screen.getByRole('button', { name: 'Buat token' }))
    await waitFor(() => expect(screen.getByText('eyJ.header.sig')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Perbarui token' })).toBeTruthy()
  })

  test('gagal membuat token → pesan error', async () => {
    asUser()
    authMock.jwtShouldFail = true
    renderAt('/settings/api-token')
    fireEvent.click(screen.getByRole('button', { name: 'Buat token' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('token gagal'))
  })
})
