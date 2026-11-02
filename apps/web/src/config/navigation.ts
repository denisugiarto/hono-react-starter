import { HomeIcon, KeyRoundIcon, NotebookPenIcon, ScrollTextIcon, SettingsIcon, ShieldCheckIcon, UsersIcon, type LucideIcon } from 'lucide-react'
import type { Permissions } from '@hono-react-starter/shared'
import { paths } from './paths.ts'

export type NavItem = {
  label: string
  to: string
  /** Ikon lucide (dipakai sidebar). */
  icon?: LucideIcon
  /** Hanya tampil bila sudah login. */
  auth?: boolean
  /** Hanya tampil bila role punya permission ini (lihat packages/shared/permissions). */
  permission?: Permissions
}

export type NavGroup = { label: string; items: NavItem[] }

/**
 * Navigasi sidebar untuk area Pengaturan & Admin (`SidebarLayout`). Grup yang
 * tidak menyisakan item setelah disaring (`useVisibleNavGroups()`) disembunyikan.
 */
export const sidebarNav: NavGroup[] = [
  {
    label: 'Umum',
    items: [
      { label: 'Beranda', to: paths.home, icon: HomeIcon },
      { label: 'Catatan', to: paths.notes, icon: NotebookPenIcon, auth: true },
    ],
  },
  {
    label: 'Akun',
    items: [
      { label: 'Keamanan', to: paths.security, icon: ShieldCheckIcon, auth: true },
      { label: 'Token API', to: paths.apiToken, icon: KeyRoundIcon, auth: true },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Pengguna', to: paths.adminUsers, icon: UsersIcon, auth: true, permission: { user: ['list'] } },
      { label: 'Audit log', to: paths.adminAuditLogs, icon: ScrollTextIcon, auth: true, permission: { audit: ['list'] } },
      { label: 'Pengaturan aplikasi', to: paths.adminSettings, icon: SettingsIcon, auth: true, permission: { settings: ['read'] } },
    ],
  },
]

/** Navigasi utama (header desktop + sheet mobile). Disaring oleh `useVisibleNav()`. */
export const mainNav: NavItem[] = [
  { label: 'Beranda', to: paths.home },
  { label: 'Catatan', to: paths.notes, auth: true },
  { label: 'Pengguna', to: paths.adminUsers, auth: true, permission: { user: ['list'] } },
  { label: 'Audit', to: paths.adminAuditLogs, auth: true, permission: { audit: ['list'] } },
]
