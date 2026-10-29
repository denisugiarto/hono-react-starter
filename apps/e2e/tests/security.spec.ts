import { expect, test, type Page } from '@playwright/test'
import { demoAccount, uniqueEmail } from './helpers.ts'

/** Kumpulkan pesan console yang menyebut CSP (pelanggaran = bug konfigurasi). */
function collectCspViolations(page: Page) {
  const violations: string[] = []
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text())
  })
  return violations
}

test.describe('keamanan', () => {
  test('CSP terpasang dan tidak memblokir aplikasi (beranda, login, catatan)', async ({ page }) => {
    const violations = collectCspViolations(page)
    const res = await page.goto('/')
    expect(res?.headers()['content-security-policy']).toContain("script-src 'self'")
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const account = demoAccount('user')
    await page.goto('/login')
    await page.getByTestId('auth-email').fill(account.email)
    await page.getByTestId('auth-password').fill(account.password)
    await page.getByTestId('auth-submit').click()
    await expect(page).toHaveURL(/\/notes$/)
    await expect(page.getByTestId('note-list')).toBeVisible()
    await page.goto('/settings/security')
    await expect(page.getByTestId('tf-status')).toBeVisible()
    expect(violations).toEqual([])
  })

  test('lockout per akun: 5 password salah → akun dikunci, password benar pun ditolak', async ({ page }) => {
    // Akun baru agar hitungan tidak terpengaruh test lain / run sebelumnya
    const email = uniqueEmail('lockout')
    const password = 'rahasia-lockout-123'
    await page.goto('/login')
    await page.getByTestId('auth-switch-mode').click()
    await page.getByTestId('auth-name').fill('Uji Lockout')
    await page.getByTestId('auth-email').fill(email)
    await page.getByTestId('auth-password').fill(password)
    await page.getByTestId('auth-submit').click()
    await expect(page).toHaveURL(/\/notes$/)
    await page.getByTestId('user-menu-trigger').click()
    await page.getByTestId('user-menu-sign-out').click()
    await expect(page.getByTestId('login-link')).toBeVisible()

    await page.goto('/login')
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('auth-email').fill(email)
      await page.getByTestId('auth-password').fill(`salah-${i}-xxxxxx`)
      await page.getByTestId('auth-submit').click()
      await expect(page.getByTestId('auth-error')).toBeVisible()
    }
    await page.getByTestId('auth-password').fill(password)
    await page.getByTestId('auth-submit').click()
    await expect(page.getByTestId('auth-error')).toContainText('Terlalu banyak percobaan')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('daftar dengan email yang sudah ada tidak membocorkan keberadaan akun', async ({ page }) => {
    const account = demoAccount('user')
    await page.goto('/login')
    await page.getByTestId('auth-switch-mode').click()
    await page.getByTestId('auth-name').fill('Penyusup')
    await page.getByTestId('auth-email').fill(account.email)
    await page.getByTestId('auth-password').fill('password-lain-123')
    await page.getByTestId('auth-submit').click()
    // Respons sama seperti daftar yang menunggu verifikasi: tidak ada pesan "sudah terdaftar"
    await expect(page.getByTestId('auth-check-inbox')).toBeVisible()
    await expect(page.getByTestId('auth-error')).toHaveCount(0)
    await expect(page.getByTestId('user-menu-trigger')).toHaveCount(0)
  })

  test('header keamanan dasar pada respons API dan halaman', async ({ request }) => {
    const api = await request.get('/api/health/live')
    const h = api.headers()
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['x-frame-options']).toBe('DENY')
    expect(h['cache-control']).toBe('no-store')
    const docs = await request.get('/api/docs')
    expect(docs.headers()['content-security-policy']).toContain('nonce-')
  })
})
