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

test.describe('pengaturan aplikasi', () => {
  test('admin melihat saklar verifikasi email; user biasa ditolak', async ({ page }) => {
    await login(page, 'admin')
    await page.goto('/admin/settings')
    await expect(page.getByTestId('app-settings-card')).toBeVisible()
    const toggle = page.getByTestId('settings-require-email-verification')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-checked', /true|false/)
    await expect(page.getByTestId('settings-mail-provider')).toHaveText('console')
  })
})

test.describe('role & permission', () => {
  test('admin membuat role dari matriks, melihatnya di daftar, lalu menghapusnya; menu aksi pengguna tersedia', async ({ page }) => {
    const roleName = `e2e-${Date.now().toString(36)}`
    await login(page, 'admin')
    await page.goto('/admin/roles')
    await expect(page.getByTestId('roles-table')).toBeVisible()
    await expect(page.getByTestId('role-row').filter({ hasText: 'admin' })).toContainText('sistem')

    await page.getByTestId('role-create').click()
    const dialog = page.getByTestId('role-dialog')
    await dialog.getByTestId('role-name').fill(roleName)
    await dialog.getByTestId('role-description').fill('Role uji E2E')
    await dialog.getByTestId('perm-note-read').click()
    await dialog.getByTestId('perm-audit-all').click()
    await dialog.getByTestId('role-submit').click()
    await expect(dialog).toBeHidden()
    const row = page.getByTestId('role-row').filter({ has: page.locator(`[data-role="${roleName}"]`) }).or(page.locator(`[data-testid="role-row"][data-role="${roleName}"]`))
    await expect(row.first()).toBeVisible()
    await expect(row.first()).toContainText('2') // 2 permission

    // Role admin: hanya lihat (terkunci)
    await page.locator('[data-testid="role-row"][data-role="admin"]').getByTestId('role-edit').click()
    await expect(page.getByTestId('role-dialog')).toContainText('tidak bisa diubah')
    await expect(page.getByTestId('role-dialog').getByTestId('role-submit')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('role-dialog')).toBeHidden()

    // Hapus role uji (tidak dipakai)
    await row.first().getByTestId('role-delete').click()
    await page.getByTestId('role-delete-confirm').click()
    await expect(page.locator(`[data-testid="role-row"][data-role="${roleName}"]`)).toHaveCount(0)

    // Aksi pengguna tersedia (bukan akun sendiri)
    await page.goto('/admin/users')
    await page.getByTestId('users-table-search').fill(demoAccount('user').email)
    const userRow = page.getByTestId('user-row').filter({ hasText: demoAccount('user').email })
    await userRow.getByTestId('user-actions').click()
    await expect(page.getByRole('menuitem', { name: 'Ubah role' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('user-create')).toBeVisible()
  })
})
