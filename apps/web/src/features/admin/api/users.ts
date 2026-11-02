import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminUserSchema, type AdminUser } from '@hono-react-starter/shared'
import { endpoints } from '@/config/endpoints'
import { request } from '@/lib/api/request'
import { adminApi } from '@/lib/auth-client'
import { notify } from '@/lib/toast'

export const adminKeys = {
  users: ['admin', 'users'] as const,
}

/**
 * Daftar semua user — hanya untuk admin.
 * `enabled` dikontrol dari luar (hanya query saat pengguna ber-role admin).
 */
export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.users,
    enabled,
    queryFn: async () => {
      const data = await request<unknown>(endpoints.admin.users)
      return adminUserSchema.array().parse(data)
    },
  })
}

type BetterAuthResult = { error: null | { message?: string; code?: string } }

/** Lempar bila Better Auth client mengembalikan `error` (tidak melempar sendiri). */
function unwrap(res: BetterAuthResult, fallback: string) {
  if (res.error) throw new Error(res.error.message || fallback)
}

function useUserMutation<TVars>(fn: (vars: TVars) => Promise<BetterAuthResult>, success: string, fallback: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: TVars) => unwrap(await fn(vars), fallback),
    onSuccess: () => {
      notify.success(success)
      void qc.invalidateQueries({ queryKey: adminKeys.users })
      void qc.invalidateQueries({ queryKey: ['admin-roles'] })
    },
    onError: (err) => notify.error(err.message || fallback),
  })
}

/** Aksi admin lewat plugin Better Auth (/api/auth/admin/*): diaudit server, permission user:*. */
export const useSetUserRole = () =>
  useUserMutation((v: { userId: string; role: string }) => adminApi.setRole(v), 'Role pengguna diubah; sesinya dicabut', 'Gagal mengubah role')
export const useBanUser = () =>
  useUserMutation((v: { userId: string; banReason?: string }) => adminApi.banUser(v), 'Pengguna diblokir', 'Gagal memblokir pengguna')
export const useUnbanUser = () => useUserMutation((v: { userId: string }) => adminApi.unbanUser(v), 'Blokir dicabut', 'Gagal mencabut blokir')
export const useCreateUser = () =>
  useUserMutation(
    (v: { name: string; email: string; password: string; role: string }) => adminApi.createUser(v),
    'Pengguna dibuat',
    'Gagal membuat pengguna',
  )
export const useRemoveUser = () => useUserMutation((v: { userId: string }) => adminApi.removeUser(v), 'Pengguna dihapus', 'Gagal menghapus pengguna')
export const useRevokeUserSessions = () =>
  useUserMutation((v: { userId: string }) => adminApi.revokeUserSessions(v), 'Semua sesi pengguna dicabut', 'Gagal mencabut sesi')

export type { AdminUser }
