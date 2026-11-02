import { describe, expect, test } from 'bun:test'
import {
  formatBytes,
  formatCompact,
  formatCurrency,
  formatNumber,
  formatPercent,
  initialsOf,
  maskEmail,
  slugify,
  summarizeMetadata,
  titleCase,
  truncate,
} from '../../src/lib/format.ts'

describe('lib/format angka', () => {
  test('formatNumber locale id; kosong/NaN → ""', () => {
    expect(formatNumber(1234567.891)).toBe('1.234.567,89')
    expect(formatNumber('42')).toBe('42')
    expect(formatNumber(null)).toBe('')
    expect(formatNumber('abc')).toBe('')
    expect(formatNumber(undefined)).toBe('')
    expect(formatNumber(1.5, { maximumFractionDigits: 0 })).toBe('2')
  })
  test('formatCurrency IDR tanpa desimal, mata uang lain ikut Intl', () => {
    expect(formatCurrency(150000)).toBe('Rp 150.000')
    expect(formatCurrency(0)).toBe('Rp 0')
    expect(formatCurrency(null)).toBe('')
    expect(formatCurrency(12.5, 'USD')).toContain('12,50')
  })
  test('formatPercent & formatCompact', () => {
    expect(formatPercent(0.256)).toBe('25,6 %')
    expect(formatPercent(1, 0)).toBe('100 %')
    expect(formatPercent(null)).toBe('')
    expect(formatCompact(12500)).toBe('12,5 rb')
    expect(formatCompact(3_400_000)).toBe('3,4 jt')
    expect(formatCompact(undefined)).toBe('')
  })
  test('formatBytes basis 1024', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1,5 KB')
    expect(formatBytes(5 * 1024 ** 3)).toBe('5 GB')
    expect(formatBytes(-1)).toBe('')
    expect(formatBytes(null)).toBe('')
  })
})

describe('lib/format teks', () => {
  test('truncate memotong di spasi bila memungkinkan', () => {
    expect(truncate('Catatan pendek', 50)).toBe('Catatan pendek')
    expect(truncate('Catatan yang cukup panjang untuk dipotong', 20)).toBe('Catatan yang cukup…')
    expect(truncate('Supercalifragilistic', 10)).toBe('Supercali…')
    expect(truncate(null, 5)).toBe('')
  })
  test('slugify & titleCase & maskEmail', () => {
    expect(slugify('Judul Catatan: Hari Ke-1!')).toBe('judul-catatan-hari-ke-1')
    expect(slugify('Café  Déjà vu')).toBe('cafe-deja-vu')
    expect(titleCase('halo dunia')).toBe('Halo Dunia')
    expect(maskEmail('budi.santoso@example.com')).toBe('bu***@example.com')
    expect(maskEmail('bukan-email')).toBe('')
    expect(maskEmail(null)).toBe('')
  })
  test('helper lama tetap: initialsOf & summarizeMetadata', () => {
    expect(initialsOf('Deni Sugiarto')).toBe('DS')
    expect(initialsOf('  ')).toBe('?')
    expect(summarizeMetadata({ email: 'a@b.co', role: ['admin'] })).toBe('email=a@b.co · role=["admin"]')
    expect(summarizeMetadata(null)).toBe('')
  })
})
