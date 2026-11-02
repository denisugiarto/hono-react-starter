import { describe, expect, test } from 'bun:test'
import { combineDateTime, formatDate, formatDateRange, formatRelative, parseDate, parseTime, toTimeString } from '../../src/lib/datetime.ts'

const d = new Date(2026, 0, 7, 14, 30, 15)

describe('lib/datetime', () => {
  test('formatDate locale id; nilai kosong/tak valid → ""', () => {
    expect(formatDate(d)).toBe('7 Jan 2026')
    expect(formatDate(d, 'd MMMM yyyy')).toBe('7 Januari 2026')
    expect(formatDate(null)).toBe('')
    expect(formatDate(new Date('x'))).toBe('')
  })
  test('toTimeString & parseTime', () => {
    expect(toTimeString(d)).toBe('14:30')
    expect(toTimeString(d, true)).toBe('14:30:15')
    expect(toTimeString(null)).toBe('')
    expect(parseTime('09:05')).toEqual({ hours: 9, minutes: 5, seconds: 0 })
    expect(parseTime('23:59:59')).toEqual({ hours: 23, minutes: 59, seconds: 59 })
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('abc')).toBeNull()
    expect(parseTime(null)).toBeNull()
  })
  test('combineDateTime menyalin jam ke tanggal; jam tak valid → jam tanggal, detik dinolkan', () => {
    const base = new Date(2026, 4, 1, 8, 15, 42)
    const c = combineDateTime(base, '17:45')
    expect([c.getFullYear(), c.getMonth(), c.getDate(), c.getHours(), c.getMinutes(), c.getSeconds()]).toEqual([2026, 4, 1, 17, 45, 0])
    const k = combineDateTime(base, 'zz')
    expect([k.getHours(), k.getMinutes(), k.getSeconds()]).toEqual([8, 15, 0])
  })
  test('parseDate & formatDateRange', () => {
    expect(parseDate('7 Jan 2026')?.getDate()).toBe(7)
    expect(parseDate('bukan tanggal')).toBeNull()
    expect(formatDateRange({ from: new Date(2026, 0, 1), to: new Date(2026, 0, 7) })).toBe('1 Jan 2026 – 7 Jan 2026')
    expect(formatDateRange({ from: new Date(2026, 0, 1), to: null })).toBe('1 Jan 2026')
    expect(formatDateRange(null)).toBe('')
  })
})

describe('lib/datetime formatRelative', () => {
  const now = new Date(2026, 0, 7, 12, 0, 0)
  test('bahasa Indonesia, lampau & mendatang', () => {
    expect(formatRelative(new Date(2026, 0, 7, 11, 55), now)).toBe('5 menit yang lalu')
    expect(formatRelative(new Date(2026, 0, 9, 12, 0), now)).toBe('lusa')
    expect(formatRelative(new Date(2026, 0, 7, 15, 0), now)).toBe('dalam 3 jam')
    expect(formatRelative(new Date(2025, 10, 7, 12, 0), now)).toBe('2 bulan yang lalu')
    expect(formatRelative(new Date(2024, 0, 7, 12, 0), now)).toBe('2 tahun yang lalu')
    expect(formatRelative(new Date(2026, 0, 21, 12, 0), now)).toBe('dalam 2 minggu')
  })
  test('baru saja, string ISO, kosong/tak valid', () => {
    expect(formatRelative(new Date(2026, 0, 7, 12, 0, 30), now)).toBe('baru saja')
    expect(formatRelative(new Date(2026, 0, 7, 11, 59, 10).toISOString(), now)).toBe('50 detik yang lalu')
    expect(formatRelative(null)).toBe('')
    expect(formatRelative('bukan tanggal')).toBe('')
  })
})
