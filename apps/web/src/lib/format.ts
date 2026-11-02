/** Inisial nama untuk avatar (maks 2 huruf), '?' bila kosong. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((p) => p[0]!.toUpperCase())
  return letters.join('') || '?'
}

/** Ringkasan metadata audit satu baris: `email=a@b.co · role=admin`. */
export function summarizeMetadata(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return ''
  return Object.entries(metadata)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' · ')
}

/** Secret base32 dari otpauth:// URI (2FA) — untuk input manual tanpa QR. */
export function secretFromTotpUri(uri: string): string | null {
  try {
    return new URL(uri).searchParams.get('secret')
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Angka & teks (locale id-ID). Nilai null/undefined/NaN → '' agar aman di JSX.
// ---------------------------------------------------------------------------

export const NUMBER_LOCALE = 'id-ID'

type Numeric = number | string | null | undefined

/** Samakan spasi khusus Intl (NBSP/narrow NBSP) jadi spasi biasa dan sisipkan spasi setelah "Rp". */
function tidy(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, ' ').replace(/^(-?)Rp(?=\d)/, '$1Rp ')
}

function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : null
}

/** `1234567.891` → `1.234.567,89` (maks 2 desimal; override lewat `options`). */
export function formatNumber(value: Numeric, options?: Intl.NumberFormatOptions): string {
  const n = toNumber(value)
  if (n === null) return ''
  return tidy(new Intl.NumberFormat(NUMBER_LOCALE, { maximumFractionDigits: 2, ...options }).format(n))
}

/** `150000` → `Rp 150.000` (IDR tanpa desimal; mata uang lain mengikuti aturan Intl). */
export function formatCurrency(value: Numeric, currency = 'IDR', options?: Intl.NumberFormatOptions): string {
  const n = toNumber(value)
  if (n === null) return ''
  const idr = currency === 'IDR' ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}
  return tidy(new Intl.NumberFormat(NUMBER_LOCALE, { style: 'currency', currency, ...idr, ...options }).format(n))
}

/** Rasio `0.256` → `25,6 %`; `digits` = jumlah desimal (default 1). */
export function formatPercent(ratio: Numeric, digits = 1): string {
  const n = toNumber(ratio)
  if (n === null) return ''
  return `${formatNumber(n * 100, { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`
}

/** `12500` → `12,5 rb`, `3400000` → `3,4 jt` (notasi ringkas untuk KPI). */
export function formatCompact(value: Numeric): string {
  const n = toNumber(value)
  if (n === null) return ''
  return tidy(new Intl.NumberFormat(NUMBER_LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(n))
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/** `1536` → `1,5 KB`; basis 1024. */
export function formatBytes(bytes: Numeric, digits = 1): string {
  const n = toNumber(bytes)
  if (n === null || n < 0) return ''
  if (n < 1024) return `${formatNumber(n, { maximumFractionDigits: 0 })} B`
  const exp = Math.min(Math.floor(Math.log(n) / Math.log(1024)), BYTE_UNITS.length - 1)
  return `${formatNumber(n / 1024 ** exp, { maximumFractionDigits: digits })} ${BYTE_UNITS[exp]}`
}

/** Potong teks ke `max` karakter (termasuk elipsis) tanpa memotong di tengah kata bila memungkinkan. */
export function truncate(text: string | null | undefined, max: number, ellipsis = '…'): string {
  if (!text) return ''
  if (text.length <= max) return text
  const cut = text.slice(0, Math.max(0, max - ellipsis.length))
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd() + ellipsis
}

/** `"Judul Catatan: Hari Ke-1!"` → `"judul-catatan-hari-ke-1"` (untuk URL/ID). */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** `"halo dunia"` → `"Halo Dunia"`. */
export function titleCase(text: string): string {
  return text.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase())
}

/** `budi.santoso@example.com` → `bu***@example.com` (untuk tampilan publik/log UI). */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return ''
  const [local, domain] = email.split('@') as [string, string]
  return `${local.slice(0, 2)}***@${domain}`
}
