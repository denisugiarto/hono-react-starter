import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { asGuest, asUser, authCalls, authMock } from '../mocks/auth-client.ts'
import { renderAt, setupEach, teardownEach, typeInto } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

const lastCall = () => authCalls[authCalls.length - 1]

describe('AuthForm — 2FA & verifikasi email', () => {
  test('sign-in → twoFactorRedirect → ke /login/two-factor dengan state.from', async () => {
    asGuest()
    authMock.result = { data: { twoFactorRedirect: true }, error: null }
    const { router } = renderAt('/notes')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    typeInto(screen.getByLabelText('Email'), 'alice@test.local')
    typeInto(screen.getByLabelText('Password'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login/two-factor'))
    expect(router.state.location.state).toEqual({ from: '/notes' })
    expect(await screen.findByText(/Masukkan kode dari aplikasi authenticator/)).toBeTruthy()
    // callbackURL absolut ikut dikirim (verifikasi email)
    expect((authCalls[0]!.payload as { callbackURL: string }).callbackURL).toBe('http://localhost:5173/verify-email')
  })

  test('EMAIL_NOT_VERIFIED → tombol kirim ulang → sendVerificationEmail + toast', async () => {
    asGuest()
    authMock.result = { error: { code: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' } }
    renderAt('/login')
    typeInto(screen.getByLabelText('Email'), 'alice@test.local')
    typeInto(screen.getByLabelText('Password'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    const resend = await screen.findByRole('button', { name: 'Kirim ulang email verifikasi' })
    fireEvent.click(resend)
    await waitFor(() => expect(lastCall()?.kind).toBe('sendVerificationEmail'))
    expect(lastCall()?.payload).toEqual({ email: 'alice@test.local', callbackURL: 'http://localhost:5173/verify-email' })
    expect(await screen.findByText('Email verifikasi dikirim ulang')).toBeTruthy()

    authMock.responses.sendVerificationEmail = { error: { message: 'Rate limited' } }
    fireEvent.click(resend)
    expect(await screen.findByText('Rate limited')).toBeTruthy()
  })

  test('daftar saat verifikasi wajib (token null) → pesan periksa email → ke halaman masuk', async () => {
    asGuest()
    authMock.result = { data: { token: null, user: { id: 'x' } }, error: null }
    renderAt('/login')
    fireEvent.click(screen.getByRole('button', { name: 'Daftar akun baru' }))
    typeInto(screen.getByLabelText('Nama'), 'Bob')
    typeInto(screen.getByLabelText('Email'), 'bob@test.local')
    typeInto(screen.getByLabelText('Password'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    expect(await screen.findByText('Periksa email Anda')).toBeTruthy()
    expect(screen.getByText('bob@test.local')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ke halaman masuk' }))
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeTruthy()
  })

  test('tautan "Lupa password?" ke /forgot-password', async () => {
    asGuest()
    const { router } = renderAt('/login')
    fireEvent.click(screen.getByRole('link', { name: 'Lupa password?' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/forgot-password'))
    expect(document.title).toContain('Lupa password')
  })
})

describe('TwoFactorPage / TwoFactorForm', () => {
  test('kode TOTP: validasi 6 digit, trustDevice, sukses → navigasi ke from', async () => {
    asGuest()
    const { router } = renderAt('/login/two-factor')
    fireEvent.click(screen.getByRole('button', { name: 'Verifikasi' }))
    expect(await screen.findByText('Kode harus 6 digit angka')).toBeTruthy()

    fireEvent.click(screen.getByRole('switch', { name: /Percayai perangkat ini/ }))
    typeInto(screen.getByLabelText('Kode authenticator'), '123456')
    asUser() // setelah verifikasi, sesi terbentuk → /notes tidak dipantulkan ke /login
    fireEvent.click(screen.getByRole('button', { name: 'Verifikasi' }))
    await waitFor(() => expect(lastCall()?.kind).toBe('twoFactor.verifyTotp'))
    expect(lastCall()?.payload).toEqual({ code: '123456', trustDevice: true })
    expect((await screen.findAllByText('Selamat datang kembali')).length).toBeGreaterThan(0)
    await waitFor(() => expect(router.state.location.pathname).toBe('/notes'))
  })

  test('kode cadangan: toggle mode, error dari server, fallback pesan', async () => {
    asGuest()
    renderAt('/login/two-factor')
    fireEvent.click(screen.getByRole('button', { name: 'Pakai kode cadangan' }))
    expect(screen.getByLabelText('Kode cadangan')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Verifikasi' }))
    expect(await screen.findByText('Kode cadangan tidak valid')).toBeTruthy()

    authMock.responses['twoFactor.verifyBackupCode'] = { error: { message: 'Invalid backup code' } }
    typeInto(screen.getByLabelText('Kode cadangan'), 'abcde-fghij')
    fireEvent.click(screen.getByRole('button', { name: 'Verifikasi' }))
    expect(await screen.findByText('Invalid backup code')).toBeTruthy()
    expect(lastCall()?.payload).toEqual({ code: 'abcde-fghij', trustDevice: false })

    authMock.responses['twoFactor.verifyBackupCode'] = { error: {} }
    fireEvent.click(screen.getByRole('button', { name: 'Verifikasi' }))
    expect(await screen.findByText('Kode tidak valid')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Pakai kode authenticator' }))
    expect(screen.getByLabelText('Kode authenticator')).toBeTruthy()
  })
})

describe('ForgotPasswordPage', () => {
  test('validasi email → requestPasswordReset(redirectTo absolut) → pesan periksa email', async () => {
    asGuest()
    const { router } = renderAt('/forgot-password')
    fireEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }))
    expect(await screen.findByText('Email tidak valid')).toBeTruthy()
    typeInto(screen.getByLabelText('Email'), 'alice@test.local')
    fireEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }))
    expect(await screen.findByText('Periksa email Anda')).toBeTruthy()
    expect(lastCall()?.payload).toEqual({ email: 'alice@test.local', redirectTo: 'http://localhost:5173/reset-password' })
    fireEvent.click(screen.getByRole('link', { name: 'Kembali ke masuk' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  test('error server tampil; tombol Batal ke /login', async () => {
    asGuest()
    authMock.responses.requestPasswordReset = { error: { message: 'Terlalu banyak permintaan' } }
    const { router } = renderAt('/forgot-password')
    typeInto(screen.getByLabelText('Email'), 'alice@test.local')
    fireEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }))
    expect(await screen.findByText('Terlalu banyak permintaan')).toBeTruthy()
    authMock.responses.requestPasswordReset = { error: {} }
    fireEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }))
    expect(await screen.findByText('Gagal mengirim permintaan')).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Batal' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})

describe('ResetPasswordPage', () => {
  test('token valid: konfirmasi harus sama → resetPassword → toast → /login', async () => {
    asGuest()
    const { router } = renderAt('/reset-password?token=tok-123')
    typeInto(screen.getByLabelText('Password baru'), 'password-baru')
    typeInto(screen.getByLabelText('Ulangi password baru'), 'beda')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan password' }))
    expect(await screen.findByText('Konfirmasi password tidak sama')).toBeTruthy()

    typeInto(screen.getByLabelText('Ulangi password baru'), 'password-baru')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan password' }))
    await waitFor(() => expect(lastCall()?.kind).toBe('resetPassword'))
    expect(lastCall()?.payload).toEqual({ newPassword: 'password-baru', token: 'tok-123' })
    expect(await screen.findByText('Password berhasil diubah. Silakan masuk.')).toBeTruthy()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  test('error server tampil (dengan & tanpa pesan)', async () => {
    asGuest()
    authMock.responses.resetPassword = { error: { message: 'Token kedaluwarsa' } }
    renderAt('/reset-password?token=tok-123')
    typeInto(screen.getByLabelText('Password baru'), 'password-baru')
    typeInto(screen.getByLabelText('Ulangi password baru'), 'password-baru')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan password' }))
    expect(await screen.findByText('Token kedaluwarsa')).toBeTruthy()
    authMock.responses.resetPassword = { error: {} }
    fireEvent.click(screen.getByRole('button', { name: 'Simpan password' }))
    expect(await screen.findByText('Gagal mengatur ulang password')).toBeTruthy()
  })

  test('tanpa token / ?error=INVALID_TOKEN / error lain → tautan minta baru', async () => {
    asGuest()
    const { router, unmount } = renderAt('/reset-password')
    expect(screen.getByText('Tautan tidak valid')).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Minta tautan baru' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/forgot-password'))
    unmount()

    renderAt('/reset-password?token=x&error=INVALID_TOKEN')
    expect(screen.getByText(/tidak valid atau sudah kedaluwarsa/)).toBeTruthy()
    screen.getByText('Tautan tidak valid').closest('[role=alert]')
  })

  test('kode error lain ditampilkan apa adanya', () => {
    asGuest()
    renderAt('/reset-password?token=x&error=UNKNOWN_THING')
    expect(screen.getByText('Terjadi kesalahan (UNKNOWN_THING).')).toBeTruthy()
  })
})

describe('VerifyEmailPage', () => {
  test('sukses: tamu → tombol Masuk; login → Buka catatan', () => {
    asGuest()
    const first = renderAt('/verify-email')
    const box = () => within(screen.getByText('Email terverifikasi').parentElement as HTMLElement)
    expect(box().getByRole('link', { name: 'Masuk' }).getAttribute('href')).toBe('/login')
    first.unmount()
    asUser()
    renderAt('/verify-email')
    expect(box().getByRole('link', { name: 'Buka catatan' }).getAttribute('href')).toBe('/notes')
  })

  test('?error=: pesan dikenal, pesan generik; tujuan tombol sesuai sesi', () => {
    asGuest()
    const first = renderAt('/verify-email?error=invalid_token')
    expect(screen.getByText(/tidak valid atau sudah kedaluwarsa/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ke halaman masuk' }).getAttribute('href')).toBe('/login')
    first.unmount()
    asUser()
    renderAt('/verify-email?error=WEIRD')
    expect(screen.getByText('Terjadi kesalahan (WEIRD).')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Kirim ulang dari pengaturan' }).getAttribute('href')).toBe('/settings/security')
  })
})

describe('SecurityPage — EmailVerificationCard', () => {
  test('belum verifikasi → badge + kirim ulang (sukses & gagal); terverifikasi → tanpa tombol', async () => {
    asUser({ emailVerified: false })
    const first = renderAt('/settings/security')
    expect(document.title).toContain('Keamanan')
    expect(screen.getByText('Belum diverifikasi')).toBeTruthy()
    const btn = screen.getByRole('button', { name: 'Kirim ulang email verifikasi' })
    fireEvent.click(btn)
    expect(await screen.findByText('Email verifikasi dikirim ke alice@test.local')).toBeTruthy()
    authMock.responses.sendVerificationEmail = { error: { message: 'Tunggu sebentar' } }
    fireEvent.click(btn)
    expect(await screen.findByText('Tunggu sebentar')).toBeTruthy()
    authMock.responses.sendVerificationEmail = { error: {} }
    fireEvent.click(btn)
    expect(await screen.findByText('Gagal mengirim email')).toBeTruthy()
    first.unmount()

    asUser({ emailVerified: true })
    renderAt('/settings/security')
    expect(screen.getByText('Terverifikasi')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Kirim ulang email verifikasi' })).toBeNull()
  })
})

describe('SecurityPage — TwoFactorCard', () => {
  const card = () => within(screen.getByText('Autentikasi dua faktor (2FA)').closest('[data-slot=card]') as HTMLElement)

  test('aktivasi: password → QR + secret + backup code → kode → aktif', async () => {
    asUser({ twoFactorEnabled: false })
    authMock.responses['twoFactor.enable'] = {
      data: { totpURI: 'otpauth://totp/App:alice?secret=SECRET123&issuer=App', backupCodes: ['aaaaa-11111', 'bbbbb-22222'] },
      error: null,
    }
    renderAt('/settings/security')
    expect(card().getByText('Nonaktif')).toBeTruthy()
    fireEvent.click(card().getByRole('button', { name: 'Mulai aktivasi 2FA' }))
    expect(await card().findByText('Password wajib diisi')).toBeTruthy()

    typeInto(card().getByLabelText('Konfirmasi password'), 'password123')
    fireEvent.click(card().getByRole('button', { name: 'Mulai aktivasi 2FA' }))
    expect(await screen.findByLabelText('QR code 2FA')).toBeTruthy()
    expect(screen.getByText('SECRET123')).toBeTruthy()
    expect(within(screen.getByRole('list', { name: 'Kode cadangan' })).getAllByRole('listitem').length).toBe(2)
    expect(lastCall()?.payload).toEqual({ password: 'password123' })

    fireEvent.click(screen.getByRole('button', { name: 'Aktifkan 2FA' }))
    expect(await screen.findByText('Kode harus 6 digit angka')).toBeTruthy()
    typeInto(screen.getByLabelText('Kode dari aplikasi'), '654321')
    fireEvent.click(screen.getByRole('button', { name: 'Aktifkan 2FA' }))
    await waitFor(() => expect(lastCall()?.kind).toBe('twoFactor.verifyTotp'))
    expect(lastCall()?.payload).toEqual({ code: '654321' })
    expect(await screen.findByText('Autentikasi dua faktor aktif')).toBeTruthy()
    expect(screen.queryByLabelText('QR code 2FA')).toBeNull()
  })

  test('aktivasi: error enable & verify; Batal menutup setup', async () => {
    asUser({ twoFactorEnabled: false })
    authMock.responses['twoFactor.enable'] = { error: { message: 'Invalid password' } }
    renderAt('/settings/security')
    typeInto(card().getByLabelText('Konfirmasi password'), 'salah')
    fireEvent.click(card().getByRole('button', { name: 'Mulai aktivasi 2FA' }))
    expect(await screen.findByText('Invalid password')).toBeTruthy()
    authMock.responses['twoFactor.enable'] = { error: {} }
    fireEvent.click(card().getByRole('button', { name: 'Mulai aktivasi 2FA' }))
    expect(await screen.findByText('Gagal memulai 2FA')).toBeTruthy()

    authMock.responses['twoFactor.enable'] = { data: { totpURI: 'otpauth://totp/x?secret=S', backupCodes: ['c1'] }, error: null }
    fireEvent.click(card().getByRole('button', { name: 'Mulai aktivasi 2FA' }))
    await screen.findByLabelText('QR code 2FA')
    authMock.responses['twoFactor.verifyTotp'] = { error: { message: 'Invalid code' } }
    typeInto(screen.getByLabelText('Kode dari aplikasi'), '111111')
    fireEvent.click(screen.getByRole('button', { name: 'Aktifkan 2FA' }))
    expect(await screen.findByText('Invalid code')).toBeTruthy()
    authMock.responses['twoFactor.verifyTotp'] = { error: {} }
    fireEvent.click(screen.getByRole('button', { name: 'Aktifkan 2FA' }))
    expect(await screen.findByText('Kode tidak valid')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(screen.queryByLabelText('QR code 2FA')).toBeNull()
  })

  test('nonaktifkan: password → disable → toast; error tampil', async () => {
    asUser({ twoFactorEnabled: true })
    renderAt('/settings/security')
    expect(card().getByText('Aktif')).toBeTruthy()
    typeInto(card().getByLabelText('Konfirmasi password'), 'password123')
    fireEvent.click(card().getByRole('button', { name: 'Nonaktifkan 2FA' }))
    await waitFor(() => expect(lastCall()?.kind).toBe('twoFactor.disable'))
    expect(await screen.findByText('Autentikasi dua faktor dinonaktifkan')).toBeTruthy()

    authMock.responses['twoFactor.disable'] = { error: { message: 'Invalid password' } }
    typeInto(card().getByLabelText('Konfirmasi password'), 'salah')
    fireEvent.click(card().getByRole('button', { name: 'Nonaktifkan 2FA' }))
    expect(await screen.findByText('Invalid password')).toBeTruthy()
    authMock.responses['twoFactor.disable'] = { error: {} }
    fireEvent.click(card().getByRole('button', { name: 'Nonaktifkan 2FA' }))
    expect(await screen.findByText('Gagal menonaktifkan 2FA')).toBeTruthy()
  })
})

describe('SecurityPage — ChangePasswordCard', () => {
  test('validasi, toggle cabut sesi, sukses → toast + reset; error tampil', async () => {
    asUser()
    renderAt('/settings/security')
    const save = screen.getByRole('button', { name: 'Simpan password' })
    fireEvent.click(save)
    expect(await screen.findByText('Password saat ini wajib diisi')).toBeTruthy()

    typeInto(screen.getByLabelText('Password saat ini'), 'sama-sama-123')
    typeInto(screen.getByLabelText('Password baru'), 'sama-sama-123')
    fireEvent.click(save)
    expect(await screen.findByText('Password baru harus berbeda')).toBeTruthy()

    fireEvent.click(screen.getByRole('switch', { name: 'Keluar dari perangkat lain' }))
    typeInto(screen.getByLabelText('Password baru'), 'password-baru-1')
    fireEvent.click(save)
    await waitFor(() => expect(lastCall()?.kind).toBe('changePassword'))
    expect(lastCall()?.payload).toEqual({ currentPassword: 'sama-sama-123', newPassword: 'password-baru-1', revokeOtherSessions: false })
    expect(await screen.findByText('Password berhasil diganti')).toBeTruthy()
    expect((screen.getByLabelText('Password saat ini') as HTMLInputElement).value).toBe('')

    authMock.responses.changePassword = { error: { message: 'Password salah' } }
    typeInto(screen.getByLabelText('Password saat ini'), 'x-123456')
    typeInto(screen.getByLabelText('Password baru'), 'password-baru-2')
    fireEvent.click(save)
    expect(await screen.findByText('Password salah')).toBeTruthy()
    authMock.responses.changePassword = { error: {} }
    fireEvent.click(save)
    expect(await screen.findByText('Gagal mengganti password')).toBeTruthy()
  })
})
