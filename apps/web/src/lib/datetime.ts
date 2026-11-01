import { format as formatFns, isValid, parse, set } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

/** Locale default aplikasi untuk tampilan tanggal (date-fns). */
export const DEFAULT_LOCALE = localeId

export const DATE_FORMAT = 'd MMM yyyy'
export const DATE_TIME_FORMAT = 'd MMM yyyy HH:mm'

/** Format tanggal untuk tampilan; `null`/tanggal tak valid → ''. */
export function formatDate(date: Date | null | undefined, pattern: string = DATE_FORMAT, locale = DEFAULT_LOCALE): string {
  if (!date || !isValid(date)) return ''
  return formatFns(date, pattern, { locale })
}

/** "HH:mm" (atau "HH:mm:ss") dari Date. */
export function toTimeString(date: Date | null | undefined, withSeconds = false): string {
  if (!date || !isValid(date)) return ''
  return formatFns(date, withSeconds ? 'HH:mm:ss' : 'HH:mm')
}

/** Parse "HH:mm" / "HH:mm:ss" → { hours, minutes, seconds } atau null bila tidak valid. */
export function parseTime(value: string | null | undefined): { hours: number; minutes: number; seconds: number } | null {
  if (!value) return null
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!m) return null
  const hours = Number(m[1])
  const minutes = Number(m[2])
  const seconds = m[3] ? Number(m[3]) : 0
  if (hours > 23 || minutes > 59 || seconds > 59) return null
  return { hours, minutes, seconds }
}

/** Gabungkan tanggal dengan jam "HH:mm[:ss]"; jam tidak valid → tanggal apa adanya (detik/ms dinolkan). */
export function combineDateTime(date: Date, time: string | null | undefined): Date {
  const t = parseTime(time)
  return set(date, { hours: t?.hours ?? date.getHours(), minutes: t?.minutes ?? date.getMinutes(), seconds: t?.seconds ?? 0, milliseconds: 0 })
}

/** Parse tanggal dari teks dengan pola tertentu (untuk input manual); null bila gagal. */
export function parseDate(text: string, pattern: string = DATE_FORMAT, locale = DEFAULT_LOCALE): Date | null {
  const d = parse(text.trim(), pattern, new Date(), { locale })
  return isValid(d) ? d : null
}

export type DateRangeValue = { from: Date | null; to: Date | null }

/** Rentang tanggal untuk tampilan: "1 Jan 2026 – 7 Jan 2026" (atau satu tanggal bila `to` kosong). */
export function formatDateRange(range: DateRangeValue | null | undefined, pattern: string = DATE_FORMAT, locale = DEFAULT_LOCALE): string {
  if (!range?.from) return ''
  const from = formatDate(range.from, pattern, locale)
  if (!range.to) return from
  return `${from} – ${formatDate(range.to, pattern, locale)}`
}
