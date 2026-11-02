import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appSettingsViewSchema, type AppSettingsUpdate, type AppSettingsView } from '@hono-react-starter/shared'
import { endpoints } from '@/config/endpoints'
import { request, requestEnvelope } from '@/lib/api/request'
import { createQueryKeys } from '@/lib/query'
import { notify } from '@/lib/toast'

export const appSettingsKeys = createQueryKeys('admin-settings')

/** GET /api/admin/settings — pengaturan runtime + kesiapan infra (permission settings:read). */
export function useAppSettings(enabled = true) {
  return useQuery({
    queryKey: appSettingsKeys.all,
    enabled,
    queryFn: async () => appSettingsViewSchema.parse(await request<unknown>(endpoints.admin.settings)),
  })
}

/** PATCH /api/admin/settings — simpan lalu segarkan; pesan server jadi toast. */
export function useUpdateAppSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AppSettingsUpdate) =>
      requestEnvelope<AppSettingsView>(endpoints.admin.settings, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: (res) => {
      qc.setQueryData(appSettingsKeys.all, appSettingsViewSchema.parse(res.data))
      notify.success(res.message ?? 'Pengaturan disimpan')
    },
    onError: (err) => notify.error(err.message || 'Pengaturan gagal disimpan'),
  })
}
