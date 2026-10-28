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
