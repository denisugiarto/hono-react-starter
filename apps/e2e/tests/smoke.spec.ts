import { expect, test } from '@playwright/test'

test.describe('smoke', () => {
  test('beranda tampil dan API health ok', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Database:')).toBeVisible()
    await expect(page.getByText('ok', { exact: true }).first()).toBeVisible()
    await expect(page.getByTestId('login-link')).toBeVisible()
  })

  test('route SPA bisa dibuka langsung (refresh di /login)', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('auth-submit')).toBeVisible()
  })

  test('dokumentasi API tersedia (OpenAPI + /api/docs)', async ({ request }) => {
    const spec = await request.get('/api/openapi.json')
    expect(spec.ok()).toBeTruthy()
    const doc = await spec.json()
    expect(doc.openapi).toBe('3.0.3')
    expect(doc.paths['/api/notes']).toBeDefined()

    const docs = await request.get('/api/docs')
    expect(docs.ok()).toBeTruthy()
    expect(docs.headers()['content-type']).toContain('text/html')
  })

  test('halaman tidak dikenal → 404 aplikasi, endpoint API tidak dikenal → 404 JSON', async ({ page, request }) => {
    await page.goto('/halaman-tidak-ada')
    await expect(page.getByText(/404/)).toBeVisible()
    const res = await request.get('/api/tidak-ada')
    expect(res.status()).toBe(404)
    expect((await res.json()).code).toBe('NOT_FOUND')
  })
})
