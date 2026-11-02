import { describe, expect, test } from 'bun:test'
import { Suspense } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { lazyWithRetry, retryImport } from '../../src/lib/lazy.ts'

const memStorage = (): Storage => {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size
    },
  }
}

describe('retryImport', () => {
  test('sukses → modul dikembalikan dan penanda dibersihkan', async () => {
    const storage = memStorage()
    storage.setItem('lazy-retry', '1')
    const mod = await retryImport(async () => ({ default: 'X' }), { storage, reload: () => {} })
    expect(mod.default).toBe('X')
    expect(storage.getItem('lazy-retry')).toBeNull()
  })
  test('gagal pertama → reload sekali; gagal kedua → error diteruskan', async () => {
    const storage = memStorage()
    let reloads = 0
    const failing = async () => {
      throw new Error('Failed to fetch dynamically imported module')
    }
    const first = retryImport(failing, { storage, reload: () => reloads++ })
    await Promise.race([first, new Promise((r) => setTimeout(r, 10))])
    expect(reloads).toBe(1)
    expect(storage.getItem('lazy-retry')).toBe('1')

    await expect(retryImport(failing, { storage, reload: () => reloads++ })).rejects.toThrow('Failed to fetch')
    expect(reloads).toBe(1)
    expect(storage.getItem('lazy-retry')).toBeNull()
  })
  test('tanpa storage (SSR) tetap reload tanpa error', async () => {
    let reloads = 0
    const p = retryImport(
      async () => {
        throw new Error('x')
      },
      { storage: undefined, reload: () => reloads++ },
    )
    await Promise.race([p, new Promise((r) => setTimeout(r, 10))])
    expect(reloads).toBe(1)
  })
  test('default reload memakai window.location.reload', async () => {
    const original = window.location.reload
    let called = 0
    Object.defineProperty(window.location, 'reload', { configurable: true, value: () => called++ })
    window.sessionStorage.removeItem('lazy-retry')
    const p = retryImport(async () => {
      throw new Error('x')
    })
    await Promise.race([p, new Promise((r) => setTimeout(r, 10))])
    expect(called).toBe(1)
    window.sessionStorage.removeItem('lazy-retry')
    Object.defineProperty(window.location, 'reload', { configurable: true, value: original })
  })
})

describe('lazyWithRetry', () => {
  test('komponen lazy dirender lewat Suspense', async () => {
    const Lazy = lazyWithRetry(async () => ({ default: () => <p>Halaman berat</p> }))
    render(
      <Suspense fallback={<p>Memuat…</p>}>
        <Lazy />
      </Suspense>,
    )
    expect(screen.getByText('Memuat…')).toBeTruthy()
    expect(await screen.findByText('Halaman berat')).toBeTruthy()
    cleanup()
  })
})
