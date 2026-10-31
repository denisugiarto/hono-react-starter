import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from './data-table'

type Order = { id: string; customer: string; total: number; status: 'paid' | 'pending' | 'failed'; date: string }
const STATUS: Order['status'][] = ['paid', 'pending', 'failed']
const orders: Order[] = Array.from({ length: 47 }, (_, i) => ({
  id: `INV-${1000 + i}`,
  customer: ['Budi', 'Sari', 'Tono', 'Dewi', 'Agus', 'Rina'][i % 6]! + ` ${String.fromCharCode(65 + (i % 26))}.`,
  total: 150_000 + ((i * 37_913) % 2_000_000),
  status: STATUS[i % 3]!,
  date: new Date(2026, 9, 1 + (i % 28)).toISOString(),
}))
const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const tgl = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' })

const columns: ColumnDef<Order, unknown>[] = [
  { accessorKey: 'id', header: 'Invoice', enableHiding: false, meta: { label: 'Invoice', className: 'font-mono text-xs' } },
  { accessorKey: 'customer', header: 'Pelanggan', meta: { label: 'Pelanggan', className: 'font-medium' } },
  {
    accessorKey: 'total',
    header: 'Total',
    meta: { label: 'Total', align: 'right', className: 'tabular-nums' },
    cell: ({ row }) => idr.format(row.original.total),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => {
      const s = row.original.status
      return <Badge variant={s === 'paid' ? 'default' : s === 'pending' ? 'secondary' : 'destructive'}>{s}</Badge>
    },
  },
  { accessorKey: 'date', header: 'Tanggal', meta: { label: 'Tanggal' }, cell: ({ row }) => tgl.format(new Date(row.original.date)) },
]

const meta = {
  title: 'Common/DataTable',
  component: DataTable<Order>,
  parameters: { layout: 'padded' },
  args: { columns, data: orders, searchable: true, columnToggle: true, pageSize: 10, searchPlaceholder: 'Cari invoice atau pelanggan…' },
} satisfies Meta<typeof DataTable<Order>>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithoutPagination: Story = { args: { pageSize: 0, data: orders.slice(0, 8), searchable: false, columnToggle: false } }
export const Loading: Story = { args: { isLoading: true, loadingLabel: 'Memuat pesanan…' } }
export const Empty: Story = { args: { data: [], emptyTitle: 'Belum ada pesanan', emptyDescription: 'Pesanan baru akan tampil di sini.' } }
export const ErrorState: Story = { args: { error: new Error('Gagal memuat pesanan (500)') } }
export const ClickableRows: Story = { args: { onRowClick: (row) => alert(`Buka ${row.id}`) } }
