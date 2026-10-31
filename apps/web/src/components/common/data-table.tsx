import { useState, type HTMLAttributes, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, Columns3Icon } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorMessage } from '@/components/common/error-message'
import { LoadingState } from '@/components/common/loading-state'
import { SearchInput } from '@/components/common/search-input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Label kolom untuk menu "Kolom" (default: id kolom). */
    label?: string
    /** Class tambahan untuk <th> dan <td>. */
    className?: string
    /** Perataan isi sel. */
    align?: 'left' | 'center' | 'right'
  }
}

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  /** Tampilkan skeleton (data belum ada). */
  isLoading?: boolean
  loadingLabel?: string
  /** Tampilkan pesan error (menggantikan tabel). */
  error?: unknown
  /** State kosong saat `data` kosong (bukan hasil pencarian). */
  emptyTitle?: string
  emptyDescription?: ReactNode
  /** Kotak pencarian global (semua kolom bertipe string/angka). */
  searchable?: boolean
  searchPlaceholder?: string
  /** Menu untuk menyembunyikan kolom (`enableHiding: false` pada kolom yang wajib). */
  columnToggle?: boolean
  /** Baris per halaman; `0` = tanpa paginasi. Default 10. */
  pageSize?: number
  pageSizeOptions?: number[]
  /** Id baris stabil (default: index). */
  getRowId?: (row: TData, index: number) => string
  /** Atribut tambahan per baris (mis. data-testid). */
  rowProps?: (row: TData) => HTMLAttributes<HTMLTableRowElement> & Record<`data-${string}`, string | undefined>
  onRowClick?: (row: TData) => void
  /** Kontrol tambahan di toolbar (kanan). */
  toolbar?: ReactNode
  className?: string
  'data-testid'?: string
}

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const

/**
 * Tabel data generik di atas TanStack Table + primitif shadcn `Table`:
 * sorting per kolom (klik header), pencarian global, paginasi client-side,
 * sembunyikan kolom, state loading/error/kosong. Untuk data besar gunakan
 * paginasi server (lihat `AuditLogsTable` dengan cursor) — komponen ini untuk
 * daftar yang muat di memori.
 *
 *   const columns: ColumnDef<User>[] = [
 *     { accessorKey: 'name', header: 'Nama', enableHiding: false },
 *     { accessorKey: 'role', header: 'Role', cell: ({ row }) => <Badge>{row.original.role}</Badge> },
 *   ]
 *   <DataTable columns={columns} data={users} searchable columnToggle />
 */
export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  loadingLabel = 'Memuat data…',
  error,
  emptyTitle = 'Tidak ada data',
  emptyDescription,
  searchable = false,
  searchPlaceholder = 'Cari…',
  columnToggle = false,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  getRowId,
  rowProps,
  onRowClick,
  toolbar,
  className,
  'data-testid': testId = 'data-table',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const paginated = pageSize > 0

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(paginated ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    initialState: paginated ? { pagination: { pageSize } } : undefined,
    globalFilterFn: 'includesString',
    // Klik pertama selalu naik (default TanStack: kolom angka turun dulu — membingungkan pengguna)
    sortDescFirst: false,
  })

  if (isLoading) return <LoadingState rows={5} label={loadingLabel} />
  if (error) return <ErrorMessage error={error} />
  if (data.length === 0) return <EmptyState data-testid={`${testId}-empty`} title={emptyTitle} description={emptyDescription} />

  const rows = table.getRowModel().rows
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide())
  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <div className={cn('space-y-3', className)} data-testid={testId}>
      {(searchable || columnToggle || toolbar) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <SearchInput
              value={globalFilter}
              onChange={setGlobalFilter}
              placeholder={searchPlaceholder}
              className="min-w-48 flex-1 sm:max-w-xs"
              data-testid={`${testId}-search`}
            />
          )}
          <div className="ml-auto flex items-center gap-2">
            {toolbar}
            {columnToggle && hideable.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button color="neutral" appearance="outline" size="sm" data-testid={`${testId}-columns`} />}
                >
                  <Columns3Icon /> Kolom
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Tampilkan kolom</DropdownMenuLabel>
                    {hideable.map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}
                      >
                        {column.columnDef.meta?.label ?? column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  const meta = header.column.columnDef.meta
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(meta?.className, meta?.align && ALIGN[meta.align])}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : canSort ? 'none' : undefined}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="-ml-2 inline-flex h-7 items-center gap-1 rounded-md px-2 font-medium hover:bg-muted hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                          data-testid={`${testId}-sort-${header.column.id}`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUpIcon className="size-3.5" />
                          ) : sorted === 'desc' ? (
                            <ArrowDownIcon className="size-3.5" />
                          ) : (
                            <ArrowUpDownIcon className="size-3.5 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-20 text-center text-muted-foreground">
                  Tidak ada hasil untuk pencarian ini.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row: Row<TData>) => (
                <TableRow
                  key={row.id}
                  {...rowProps?.(row.original)}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta
                    return (
                      <TableCell key={cell.id} className={cn(meta?.className, meta?.align && ALIGN[meta.align])}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {paginated && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span data-testid={`${testId}-count`}>
            {filteredCount} baris
            {globalFilter && filteredCount !== data.length ? ` dari ${data.length}` : ''}
          </span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5">
              <span>Per halaman</span>
              <select
                className="h-7 rounded-md border bg-background px-1.5 text-sm text-foreground"
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                data-testid={`${testId}-page-size`}
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span data-testid={`${testId}-page`}>
              Halaman {pageCount === 0 ? 0 : pageIndex + 1} dari {pageCount}
            </span>
            <Button
              color="neutral"
              appearance="outline"
              size="icon-sm"
              aria-label="Halaman sebelumnya"
              data-testid={`${testId}-prev`}
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              color="neutral"
              appearance="outline"
              size="icon-sm"
              aria-label="Halaman berikutnya"
              data-testid={`${testId}-next`}
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
