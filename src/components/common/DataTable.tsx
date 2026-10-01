import { cn } from 'cn'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type Column<T> = {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowClassName,
  isLoading,
  emptyText,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string | undefined
  isLoading?: boolean
  emptyText?: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
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
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyText ?? t('common.empty')}
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && 'cursor-pointer', rowClassName?.(row))}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
