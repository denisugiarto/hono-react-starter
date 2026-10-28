import { expect, test } from '@playwright/test'
import { login } from './helpers.ts'

test.describe('catatan', () => {
  test('tambah → tandai selesai → hapus', async ({ page }) => {
    await login(page, 'user')
    const title = `Catatan E2E ${Date.now()}`

    await page.getByTestId('note-title').fill(title)
    await page.getByTestId('note-content').fill('Dibuat oleh Playwright')
    await page.getByTestId('note-submit').click()

    const item = page.getByTestId('note-item').filter({ hasText: title })
    await expect(item).toBeVisible()
    await expect(page.getByTestId('note-title')).toHaveValue('')

    await item.getByTestId('note-toggle').click()
    await expect(item.getByText(title)).toHaveClass(/line-through/)

    await item.getByTestId('note-delete').click()
    await expect(item).toHaveCount(0)
    await expect(page.getByText('Catatan dihapus').first()).toBeVisible()
  })

  test('validasi: judul kosong tidak dikirim', async ({ page }) => {
    await login(page, 'user')
    const before = await page.getByTestId('note-item').count()
    await page.getByTestId('note-submit').click()
    await expect(page.getByText('title wajib diisi')).toBeVisible()
    await expect(page.getByTestId('note-item')).toHaveCount(before)
  })
})
