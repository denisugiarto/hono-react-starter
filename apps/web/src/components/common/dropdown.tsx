import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type DropdownItem =
  | { type: 'separator'; key?: string }
  | { type: 'label'; label: string; key?: string }
  | {
      type?: 'item'
      key?: string
      label: ReactNode
      icon?: LucideIcon
      shortcut?: string
      destructive?: boolean
      disabled?: boolean
      onSelect?: () => void
      /** Render sebagai elemen lain (mis. `<Link to="…" />`). */
      render?: React.ReactElement
    }

type Props = {
  /** Elemen pemicu (biasanya `<Button … />`). */
  trigger: React.ReactElement
  items: DropdownItem[]
  /** Judul grup di atas item pertama. */
  title?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

/**
 * Dropdown aksi berbasis data di atas `DropdownMenu`: cocok untuk menu baris tabel,
 * tombol "…", atau menu akun. Item dipisah separator, bisa berikon, pintasan, dan
 * destructive. Untuk menu dengan konten kustom (checkbox, submenu) pakai primitif langsung.
 *
 *   <Dropdown
 *     trigger={<Button color="neutral" appearance="ghost" size="icon-sm" aria-label="Aksi"><EllipsisIcon /></Button>}
 *     items={[
 *       { label: 'Ubah', icon: PencilIcon, onSelect: edit },
 *       { type: 'separator' },
 *       { label: 'Hapus', icon: Trash2Icon, destructive: true, onSelect: remove },
 *     ]}
 *   />
 */
export function Dropdown({ trigger, items, title, align = 'end', side, className }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align={align} side={side} className={className ?? 'w-48'}>
        <DropdownMenuGroup>
          {title && <DropdownMenuLabel>{title}</DropdownMenuLabel>}
          {items.map((item, i) => {
            if (item.type === 'separator') return <DropdownMenuSeparator key={item.key ?? `sep-${i}`} />
            if (item.type === 'label') return <DropdownMenuLabel key={item.key ?? `label-${i}`}>{item.label}</DropdownMenuLabel>
            const { icon: Icon } = item
            return (
              <DropdownMenuItem
                key={item.key ?? i}
                variant={item.destructive ? 'destructive' : 'default'}
                disabled={item.disabled}
                onClick={item.onSelect}
                render={item.render}
                data-testid="dropdown-item"
              >
                {Icon && <Icon />}
                {item.label}
                {item.shortcut && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
