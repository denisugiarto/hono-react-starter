type Primitive = string | number | boolean
export type QueryParams = Record<string, Primitive | null | undefined | readonly Primitive[]>

/**
 * Gabungkan path + query string. Nilai null/undefined dilewati; array menjadi
 * `key=a&key=b`. `buildUrl('/api/notes', { page: 2, tag: ['a', 'b'] })`.
 */
export function buildUrl(path: string, query?: QueryParams): string {
  if (!query) return path
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, String(v))
  }
  const qs = params.toString()
  return qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path
}
