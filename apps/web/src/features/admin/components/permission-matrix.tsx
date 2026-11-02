import { GRANTABLE_ACTIONS, PERMISSION_RESOURCES, type Permissions, type Resource } from '@hono-react-starter/shared'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { RESOURCE_LABELS, actionLabel } from '../permission-labels.ts'

export type PermissionMatrixProps = {
  value: Permissions
  onChange?: (next: Permissions) => void
  /** Hanya tampil (mis. role admin terkunci). */
  readOnly?: boolean
  className?: string
}

const has = (value: Permissions, resource: Resource, action: string) =>
  ((value[resource] as readonly string[] | undefined) ?? []).includes(action)

/**
 * Matriks resource × aksi (checkbox) untuk menyusun permission sebuah role.
 * Kolom "Semua" per baris memilih/menghapus seluruh aksi resource itu.
 * testid: `perm-<resource>-<aksi>`, `perm-<resource>-all`.
 */
export function PermissionMatrix({ value, onChange, readOnly = false, className }: PermissionMatrixProps) {
  const toggle = (resource: Resource, action: string, checked: boolean) => {
    const current = ((value[resource] as readonly string[] | undefined) ?? []).filter((a) => a !== action)
    const next = checked ? [...current, action] : current
    emit({ ...value, [resource]: next })
  }
  const toggleAll = (resource: Resource, checked: boolean) => emit({ ...value, [resource]: checked ? [...GRANTABLE_ACTIONS[resource]] : [] })
  const emit = (next: Record<string, readonly string[]>) => {
    const cleaned = Object.fromEntries(Object.entries(next).filter(([, actions]) => actions.length > 0))
    onChange?.(cleaned as Permissions)
  }

  return (
    <div className={cn('overflow-x-auto rounded-md border', className)} data-testid="permission-matrix">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Resource</th>
            <th className="px-3 py-2 font-medium">Semua</th>
            <th className="px-3 py-2 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {PERMISSION_RESOURCES.map((resource) => {
            const actions = GRANTABLE_ACTIONS[resource]
            const granted = actions.filter((a) => has(value, resource, a)).length
            const all = granted === actions.length
            return (
              <tr key={resource} className="border-t align-top" data-testid={`perm-row-${resource}`}>
                <td className="px-3 py-2">
                  <div className="font-medium">{RESOURCE_LABELS[resource]}</div>
                  <div className="text-xs text-muted-foreground">
                    <code>{resource}</code> · {granted}/{actions.length}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Checkbox
                    aria-label={`Semua aksi ${RESOURCE_LABELS[resource]}`}
                    data-testid={`perm-${resource}-all`}
                    checked={all}
                    indeterminate={!all && granted > 0}
                    disabled={readOnly}
                    onCheckedChange={(checked) => toggleAll(resource, checked === true)}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {actions.map((action) => {
                      const id = `perm-${resource}-${action}`
                      // Bukan <label> pembungkus: klik pada checkbox di dalam label memicu
                      // aktivasi label → toggle dua kali (happy-dom & beberapa browser).
                      return (
                        <div key={action} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            id={id}
                            data-testid={id}
                            checked={has(value, resource, action)}
                            disabled={readOnly}
                            onCheckedChange={(checked) => toggle(resource, action, checked === true)}
                          />
                          <label htmlFor={id} className={cn(readOnly ? 'cursor-default' : 'cursor-pointer')}>
                            {actionLabel(action)} <code className="text-xs text-muted-foreground">{action}</code>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
