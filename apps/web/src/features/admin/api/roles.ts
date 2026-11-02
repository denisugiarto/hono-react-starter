import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { roleListSchema, type RoleCreateInput, type RoleUpdateInput, type RoleView } from '@hono-react-starter/shared'
import { endpoints } from '@/config/endpoints'
import { request, requestEnvelope } from '@/lib/api/request'
import { createQueryKeys } from '@/lib/query'
import { notify } from '@/lib/toast'
import { adminKeys } from './users.ts'

export const roleKeys = createQueryKeys('admin-roles')

/** GET /api/admin/roles — semua role + jumlah pengguna (permission role:list). */
export function useRoles(enabled = true) {
  return useQuery({
    queryKey: roleKeys.all,
    enabled,
    queryFn: async () => roleListSchema.parse(await request<unknown>(endpoints.admin.roles)),
  })
}

function useRoleMutation<TVars>(fn: (vars: TVars) => Promise<{ message?: string }>, fallback: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      notify.success(res.message ?? fallback)
      void qc.invalidateQueries({ queryKey: roleKeys.all })
      void qc.invalidateQueries({ queryKey: adminKeys.users })
    },
    onError: (err) => notify.error(err.message || 'Gagal menyimpan role'),
  })
}

export const useCreateRole = () =>
  useRoleMutation((input: RoleCreateInput) => requestEnvelope<RoleView>(endpoints.admin.roles, { method: 'POST', body: JSON.stringify(input) }), 'Role dibuat')

export const useUpdateRole = () =>
  useRoleMutation(
    ({ name, ...input }: RoleUpdateInput & { name: string }) =>
      requestEnvelope<RoleView>(endpoints.admin.role(name), { method: 'PATCH', body: JSON.stringify(input) }),
    'Role disimpan',
  )

export const useDeleteRole = () =>
  useRoleMutation((name: string) => requestEnvelope<{ name: string }>(endpoints.admin.role(name), { method: 'DELETE' }), 'Role dihapus')
