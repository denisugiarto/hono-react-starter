import { expect, test } from '@playwright/test'
import { demoAccount, login } from './helpers.ts'

test.describe('admin & RBAC', () => {
  test('admin melihat daftar pengguna dan audit log', async ({ page }) => {
    await login(page, 'admin')
    await page.goto('/admin/users')
    await expect(page.getByTestId('users-table')).toBeVisible()
    await expect(page.getByTestId('user-row').filter({ hasText: demoAccount('user').email })).toBeVisible()
    await expect(page.getByTestId('user-row').filter({ hasText: demoAccount('banned').email })).toContainText('banned')

    await page.goto('/admin/audit-logs')
    await expect(page.getByTestId('audit-table')).toBeVisible()
    // Login admin barusan tercatat
    await expect(page.getByTestId('audit-row').filter({ hasText: 'auth.sign_in' }).first()).toBeVisible()

    await page.getByTestId('audit-success').selectOption('false')
    await expect(page.getByTestId('audit-row').filter({ hasText: 'berhasil' })).toHaveCount(0)
  })

  test('user biasa tidak melihat menu admin dan ditolak di /admin/users', async ({ page }) => {
    await login(page, 'user')
    await page.getByTestId('user-menu-trigger').click()
    await expect(page.getByTestId('user-menu-users')).toHaveCount(0)
    await page.keyboard.press('Escape')

    await page.goto('/admin/users')
    await expect(page.getByTestId('forbidden')).toBeVisible()
  })

  test('endpoint admin tanpa sesi → 401 JSON', async ({ request }) => {
    const res = await request.get('/api/admin/users')
    expect(res.status()).toBe(401)
    expect((await res.json()).code).toBe('UNAUTHORIZED')
  })
})
