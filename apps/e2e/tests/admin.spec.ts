import { expect, test } from '@playwright/test'
import { demoAccount, login } from './helpers.ts'

test.describe('admin & RBAC', () => {
  test('admin melihat daftar pengguna dan audit log', async ({ page }) => {
    await login(page, 'admin')
    await page.goto('/admin/users')
    await expect(page.getByTestId('users-table')).toBeVisible()
    // Tabel berpaginasi (10/halaman) dan DB test bisa berisi banyak user dari run lain → cari dulu
    const search = page.getByTestId('users-table-search')
    await search.fill(demoAccount('user').email)
    await expect(page.getByTestId('user-row').filter({ hasText: demoAccount('user').email })).toBeVisible()
    await search.fill(demoAccount('banned').email)
    await expect(page.getByTestId('user-row').filter({ hasText: demoAccount('banned').email })).toContainText('banned')
    await search.fill('')
    // Sorting & pilih kolom tersedia
    await page.getByTestId('users-table-sort-name').click()
    await expect(page.getByRole('columnheader', { name: /Nama/ })).toHaveAttribute('aria-sort', 'ascending')
    await page.getByTestId('users-table-columns').click()
    await page.getByRole('menuitemcheckbox', { name: 'Terdaftar' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('columnheader', { name: 'Terdaftar' })).toHaveCount(0)

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
