'use client'

import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: React.ReactNode
  /** Falls back to `row[key]` when omitted. */
  cell?: (row: T) => React.ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
}

export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  loading,
  empty,
  onRowClick,
  sortBy,
  sortDir,
  onSort,
  className,
}: {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  empty?: React.ReactNode
  onRowClick?: (row: T) => void
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  className?: string
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-12" />
        ))}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="px-6 py-16 text-center">
        {empty ?? <p className="text-sm text-muted">Nothing here yet.</p>}
      </div>
    )
  }

  return (
    // Wide tables scroll inside their own container rather than pushing the page.
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => {
              const isSorted = sortBy === column.key
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={cn(
                    'whitespace-nowrap px-5 py-3 text-[12.5px] font-semibold uppercase tracking-wide text-muted',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                    !column.align && 'text-left',
                    column.className,
                  )}
                >
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 transition hover:text-ink',
                        isSorted && 'text-ink',
                      )}
                    >
                      {column.header}
                      <span aria-hidden className="text-[10px]">
                        {isSorted ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id ?? index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-line/70 last:border-0',
                onRowClick && 'cursor-pointer transition hover:bg-surface-sunken',
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-5 py-3.5 text-ink-soft',
                    column.align === 'right' && 'text-right tabular',
                    column.align === 'center' && 'text-center',
                    column.className,
                  )}
                >
                  {column.cell ? column.cell(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
