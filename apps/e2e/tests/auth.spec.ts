import { expect, test } from '@playwright/test'
import { demoAccount, login, logout, submitLogin, uniqueEmail } from './helpers.ts'

test.describe('autentikasi', () => {
  test('daftar akun baru → masuk otomatis → keluar', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('auth-switch-mode').click()
    await page.getByTestId('auth-name').fill('Pengguna E2E')
    await page.getByTestId('auth-email').fill(uniqueEmail('daftar'))
    await page.getByTestId('auth-password').fill('rahasia-e2e-123')
    await page.getByTestId('auth-submit').click()

    await expect(page).toHaveURL(/\/notes$/)
    await expect(page.getByTestId('notes-empty')).toBeVisible()
    await logout(page)
  })

  test('password salah → pesan error, tetap di /login', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('auth-email').fill(demoAccount('user').email)
    await page.getByTestId('auth-password').fill('password-salah-123')
    await page.getByTestId('auth-submit').click()
    await expect(page.getByTestId('auth-error')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('validasi client: email kosong tidak dikirim', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('auth-submit').click()
    await expect(page.getByText('Email tidak valid')).toBeVisible()
  })

  test('akun diblokir ditolak', async ({ page }) => {
    await submitLogin(page, 'banned')
    await expect(page.getByTestId('auth-error')).toBeVisible()
  })

  test('halaman terproteksi tanpa login → redirect ke /login lalu kembali setelah masuk', async ({ page }) => {
    await page.goto('/notes')
    await expect(page).toHaveURL(/\/login$/)
    const account = demoAccount('user')
    await page.getByTestId('auth-email').fill(account.email)
    await page.getByTestId('auth-password').fill(account.password)
    await page.getByTestId('auth-submit').click()
    await expect(page).toHaveURL(/\/notes$/)
  })

  test('lupa password: form terkirim → instruksi periksa email', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('auth-forgot-link').click()
    await expect(page).toHaveURL(/\/forgot-password$/)
    await page.getByTestId('forgot-email').fill(demoAccount('user').email)
    await page.getByTestId('forgot-submit').click()
    await expect(page.getByTestId('forgot-sent')).toBeVisible()
  })

  test('masuk sebagai user demo lalu buka Keamanan', async ({ page }) => {
    await login(page, 'user')
    await page.getByTestId('user-menu-trigger').click()
    await page.getByTestId('user-menu-security').click()
    await expect(page).toHaveURL(/\/settings\/security$/)
    await expect(page.getByTestId('tf-status')).toHaveText('Nonaktif')
    await expect(page.getByTestId('cp-submit')).toBeVisible()
  })
})
