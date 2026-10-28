import type { Permissions } from '@hono-react-starter/shared'
import { paths } from './paths.ts'

export type NavItem = {
  label: string
  to: string
  /** Hanya tampil bila sudah login. */
  auth?: boolean
  /** Hanya tampil bila role punya permission ini (lihat packages/shared/permissions). */
  permission?: Permissions
}

/** Navigasi utama (header desktop + sheet mobile). Disaring oleh `useVisibleNav()`. */
export const mainNav: NavItem[] = [
  { label: 'Beranda', to: paths.home },
  { label: 'Catatan', to: paths.notes, auth: true },
  { label: 'Pengguna', to: paths.adminUsers, auth: true, permission: { user: ['list'] } },
]
