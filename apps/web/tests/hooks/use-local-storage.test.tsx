import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useLocalStorage } from '../../src/hooks/use-local-storage.ts'

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('useLocalStorage', () => {
  test('membaca nilai awal dari storage, menulis saat berubah, remove mengembalikan default', () => {
    window.localStorage.setItem('k', JSON.stringify(20))
    const { result } = renderHook(() => useLocalStorage('k', 10))
    expect(result.current[0]).toBe(20)
    act(() => result.current[1](30))
    expect(JSON.parse(window.localStorage.getItem('k')!)).toBe(30)
    act(() => result.current[1]((v) => v + 1))
    expect(result.current[0]).toBe(31)
    act(() => result.current[2]())
    expect(result.current[0]).toBe(10)
  })
  test('JSON rusak → default; sinkron lewat event storage', () => {
    window.localStorage.setItem('k', '{bukan json')
    const { result } = renderHook(() => useLocalStorage('k', 'd'))
    expect(result.current[0]).toBe('d')
    window.localStorage.setItem('k', JSON.stringify('dari-tab-lain'))
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'k' }))
    })
    expect(result.current[0]).toBe('dari-tab-lain')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'lain' }))
    })
    expect(result.current[0]).toBe('dari-tab-lain')
  })
  test('storage gagal (setItem/getItem/removeItem melempar) → tetap bekerja di memori', () => {
    const proto = Object.getPrototypeOf(window.localStorage) as Storage
    const saved = { getItem: proto.getItem, setItem: proto.setItem, removeItem: proto.removeItem }
    const boom = () => {
      throw new Error('QuotaExceeded')
    }
    proto.getItem = boom
    proto.setItem = boom
    proto.removeItem = boom
    try {
      const { result } = renderHook(() => useLocalStorage('k', 1))
      expect(result.current[0]).toBe(1)
      act(() => result.current[1](2))
      expect(result.current[0]).toBe(2)
      act(() => result.current[2]())
      expect(result.current[0]).toBe(1)
    } finally {
      Object.assign(proto, saved)
    }
  })
})
