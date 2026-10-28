/** Inisial nama untuk avatar (maks 2 huruf), '?' bila kosong. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((p) => p[0]!.toUpperCase())
  return letters.join('') || '?'
}
