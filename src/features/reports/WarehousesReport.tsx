import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatWeight } from '@/lib/format'
import { cn } from '@/lib/utils'
import { downloadWarehouses, useWarehousesReport } from './api'
import { ExcelButton } from './PeriodBar'
import { daysClass } from './period'

/** What lies at each warehouse now, the longest lying first, and what is not planned into any trip. */
export function WarehousesReport() {
  const { t } = useTranslation(['reports', 'common'])
  const query = useWarehousesReport()
  const r = query.data
  if (query.isPending || !r) return <Skeleton className="h-60 w-full" />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExcelButton onClick={downloadWarehouses} />
      </div>
      {!r.warehouses?.length && (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('reports:warehouses.empty')}</p>
          </CardContent>
        </Card>
      )}
      {(r.warehouses ?? []).map((w) => (
        <Card key={w.warehouseId}>
          <CardHeader>
            <CardTitle>{w.name}</CardTitle>
            <CardDescription>
              {t('reports:debts.parcels', { count: w.parcels ?? 0 })} · {t('reports:trips.seats', { count: w.seats ?? 0 })}
              {(w.unplanned ?? 0) > 0 && ` · ${t('reports:warehouses.unplanned', { count: w.unplanned })}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(w.ages ?? []).map((a) => (
                <div key={a.age} className={cn('rounded-lg border p-3', a.age === 'OVER_14' && (a.parcels ?? 0) > 0 && 'border-destructive/40')}>
                  <p className="text-xs text-muted-foreground">{t(`reports:warehouses.age.${a.age}`)}</p>
                  <p className="text-xl font-semibold tabular-nums">{a.parcels}</p>
                </div>
              ))}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports:debts.what')}</TableHead>
                  <TableHead>{t('reports:debts.client')}</TableHead>
                  <TableHead className="text-right">{t('reports:warehouses.seatsHere')}</TableHead>
                  <TableHead className="text-right">{t('reports:warehouses.weight')}</TableHead>
                  <TableHead>{t('reports:warehouses.since')}</TableHead>
                  <TableHead className="text-right">{t('reports:debts.days')}</TableHead>
                  <TableHead>{t('reports:warehouses.plannedTrip')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(w.rows ?? []).map((s) => (
                  <TableRow key={s.parcelId}>
                    <TableCell>
                      <Link to={`/${s.kind === 'MOVE' ? 'moves' : 'parcels'}/${s.parcelId}`} className="font-mono hover:underline">
                        {s.code}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{t(s.kind === 'MOVE' ? 'reports:cash.move' : 'reports:cash.parcel')}</span>
                    </TableCell>
                    <TableCell>{s.clientName ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.seatsHere === s.seatsTotal ? s.seatsHere : t('reports:warehouses.seatsOf', { here: s.seatsHere, total: s.seatsTotal })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatWeight(s.weightKg)}</TableCell>
                    <TableCell>{formatDate(s.since)}</TableCell>
                    <TableCell className={daysClass(s.days)}>{s.days}</TableCell>
                    <TableCell>{s.plannedTrip ? `№${s.plannedTrip}` : <span className="text-amber-700 dark:text-amber-400">{t('reports:warehouses.notPlanned')}</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
