import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { toast as sonner } from 'sonner'
import { notify } from '../../src/lib/toast.ts'

const spies: ReturnType<typeof spyOn>[] = []
const spy = <K extends 'success' | 'info' | 'warning' | 'error' | 'message' | 'loading' | 'promise' | 'dismiss'>(k: K) => {
  const s = spyOn(sonner, k).mockImplementation((() => 1) as never)
  spies.push(s)
  return s
}
afterEach(() => {
  for (const s of spies) s.mockRestore()
  spies.length = 0
})

describe('notify (pembungkus sonner)', () => {
  test('durasi default 4 detik; warning & error 6 detik; error punya tombol tutup; opsi pemanggil menang', () => {
    const success = spy('success')
    const info = spy('info')
    const warning = spy('warning')
    const error = spy('error')
    const message = spy('message')
    notify.success('Tersimpan')
    notify.info('Info')
    notify.warning('Awas', { description: 'd' })
    notify.error('Gagal')
    notify.error('Gagal cepat', { duration: 1000 })
    notify.message('Netral', { id: 'x' })
    expect(success).toHaveBeenCalledWith('Tersimpan', { duration: 4000 })
    expect(info).toHaveBeenCalledWith('Info', { duration: 4000 })
    expect(warning).toHaveBeenCalledWith('Awas', { duration: 6000, description: 'd' })
    expect(error).toHaveBeenNthCalledWith(1, 'Gagal', { duration: 6000, closeButton: true })
    expect(error).toHaveBeenNthCalledWith(2, 'Gagal cepat', { duration: 1000, closeButton: true })
    expect(message).toHaveBeenCalledWith('Netral', { duration: 4000, id: 'x' })
  })

  test('loading, promise, dismiss diteruskan apa adanya', async () => {
    const loading = spy('loading')
    const promise = spy('promise')
    const dismiss = spy('dismiss')
    notify.loading('Memuat…')
    const p = Promise.resolve(3)
    const messages = { loading: 'Menghitung…', success: (n: number) => `Hasil ${n}`, error: 'Gagal' }
    notify.promise(p, messages)
    notify.dismiss('abc')
    notify.dismiss()
    expect(loading).toHaveBeenCalledWith('Memuat…', {})
    expect(promise).toHaveBeenCalledWith(p, messages)
    expect(dismiss).toHaveBeenNthCalledWith(1, 'abc')
    expect(dismiss).toHaveBeenNthCalledWith(2, undefined)
  })
})
