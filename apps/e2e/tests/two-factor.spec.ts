import { expect, test } from '@playwright/test'
import { submitLogin, totpCode } from './helpers.ts'

test.describe('2FA (TOTP)', () => {
  test('akun ber-2FA → langkah kode → kode salah ditolak → kode benar masuk', async ({ page }) => {
    await submitLogin(page, 'totp')
    await expect(page).toHaveURL(/\/login\/two-factor$/)

    await page.getByTestId('totp-code').fill('000000')
    await page.getByTestId('totp-submit').click()
    await expect(page.getByTestId('totp-error')).toBeVisible()

    await page.getByTestId('totp-code').fill(await totpCode())
    await page.getByTestId('totp-submit').click()
    await expect(page).toHaveURL(/\/notes$/)

    await page.goto('/settings/security')
    await expect(page.getByTestId('tf-status')).toHaveText('Aktif')
  })

  test('tombol beralih ke kode cadangan mengubah label field', async ({ page }) => {
    await submitLogin(page, 'totp')
    await expect(page).toHaveURL(/\/login\/two-factor$/)
    await page.getByTestId('totp-toggle-backup').click()
    await expect(page.getByText('Kode cadangan', { exact: true })).toBeVisible()
  })
})
