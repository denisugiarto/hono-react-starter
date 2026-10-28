import { expect, type Page } from '@playwright/test'
import { createOTP } from '@better-auth/utils/otp'
import { demoAccount, type DemoAccountKey } from '../../../packages/shared/src/demo.ts'

export { DEMO_ACCOUNTS, DEMO_NOTES, demoAccount } from '../../../packages/shared/src/demo.ts'

/** Kode TOTP saat ini untuk akun demo `totp` (secret tetap, lihat shared/demo.ts). */
export const totpCode = () => createOTP(demoAccount('totp').totpSecret!, { digits: 6, period: 30 }).totp()

/** Email unik per run agar test sign-up tidak saling bentrok. */
export const uniqueEmail = (prefix = 'e2e') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`

/** Isi form masuk dengan akun demo dan kirim (tanpa menunggu hasil). */
export async function submitLogin(page: Page, key: DemoAccountKey) {
  const account = demoAccount(key)
  await page.goto('/login')
  await page.getByTestId('auth-email').fill(account.email)
  await page.getByTestId('auth-password').fill(account.password)
  await page.getByTestId('auth-submit').click()
}

/** Masuk sebagai akun demo (tanpa 2FA) dan tunggu sampai halaman Catatan terbuka. */
export async function login(page: Page, key: Exclude<DemoAccountKey, 'totp' | 'banned'>) {
  await submitLogin(page, key)
  await expect(page).toHaveURL(/\/notes$/)
  await expect(page.getByTestId('user-menu-trigger')).toBeVisible()
}

/** Keluar lewat menu pengguna. */
export async function logout(page: Page) {
  await page.getByTestId('user-menu-trigger').click()
  await page.getByTestId('user-menu-sign-out').click()
  await expect(page.getByTestId('login-link')).toBeVisible()
}
