import { cn } from 'cn'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type Column<T> = {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
}

export type Selection = {
  selected: Set<string | number>
  onChange: (next: Set<string | number>) => void
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowClassName,
  isLoading,
  emptyText,
  selection,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string | undefined
  isLoading?: boolean
  emptyText?: ReactNode
  selection?: Selection
}) {
  const { t } = useTranslation()
  const colSpan = columns.length + (selection ? 1 : 0)
  const keys = rows.map(rowKey)
  const allSelected = selection != null && keys.length > 0 && keys.every((k) => selection.selected.has(k))
  const someSelected = selection != null && keys.some((k) => selection.selected.has(k))

  const toggleAll = (checked: boolean) => {
    if (!selection) return
    const next = new Set(selection.selected)
    for (const k of keys) {
      if (checked) next.add(k)
      else next.delete(k)
    }
    selection.onChange(next)
  }

  const toggleOne = (key: string | number, checked: boolean) => {
    if (!selection) return
    const next = new Set(selection.selected)
    if (checked) next.add(key)
    else next.delete(key)
    selection.onChange(next)
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {selection && (
              <TableHead className="w-10">
                <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onCheckedChange={(c) => toggleAll(c === true)} aria-label="select all" />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            rows.length === 0 &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {selection && <TableCell />}
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                {emptyText ?? t('common.empty')}
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => {
            const key = rowKey(row)
            return (
              <TableRow
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && 'cursor-pointer', selection?.selected.has(key) && 'bg-muted/50', rowClassName?.(row))}
              >
                {selection && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selection.selected.has(key)} onCheckedChange={(c) => toggleOne(key, c === true)} aria-label="select row" />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
