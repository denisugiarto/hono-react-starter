/** Nama cookie yang ditulis SidebarProvider (shadcn) saat sidebar diciutkan/diperluas. */
export const SIDEBAR_COOKIE = 'sidebar_state'

/** Baca state sidebar tersimpan (`sidebar_state=true|false`); default terbuka. */
export function readSidebarOpen(cookie: string = typeof document === 'undefined' ? '' : document.cookie): boolean {
  const match = cookie.split(';').find((c) => c.trim().startsWith(`${SIDEBAR_COOKIE}=`))
  return match ? match.split('=')[1]?.trim() !== 'false' : true
}
