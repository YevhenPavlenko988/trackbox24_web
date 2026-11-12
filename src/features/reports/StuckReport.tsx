import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDateTime } from '@/lib/format'
import { downloadStuck, useStuckReport } from './api'
import { ExcelButton } from './PeriodBar'
import { daysClass } from './period'

const THRESHOLDS = [3, 7, 14, 30]

/** What has not moved for days, and what waits on Nova Poshta's paid storage. */
export function StuckReport() {
  const { t } = useTranslation(['reports', 'common'])
  const [days, setDays] = useState(7)
  const query = useStuckReport(days)
  const r = query.data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('reports:stuck.threshold')}</span>
        <div className="flex flex-wrap gap-1" role="group">
          {THRESHOLDS.map((d) => (
            <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>
              {t('reports:stuck.days', { count: d })}
            </Button>
          ))}
        </div>
        <ExcelButton className="ml-auto" onClick={() => downloadStuck(days)} />
      </div>
      {query.isPending || !r ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle data-testid="stuck-title">{t('reports:stuck.title', { count: r.rows?.length ?? 0 })}</CardTitle>
            <CardDescription>{t('reports:stuck.hint', { count: days })}</CardDescription>
          </CardHeader>
          <CardContent>
            {!r.rows?.length ? (
              <p className="text-sm text-muted-foreground">{t('reports:stuck.empty')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports:debts.what')}</TableHead>
                    <TableHead>{t('reports:stuck.status')}</TableHead>
                    <TableHead>{t('reports:stuck.where')}</TableHead>
                    <TableHead>{t('reports:debts.client')}</TableHead>
                    <TableHead>{t('reports:stuck.changedAt')}</TableHead>
                    <TableHead className="text-right">{t('reports:debts.days')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.rows.map((s) => (
                    <TableRow key={s.parcelId}>
                      <TableCell>
                        <Link to={`/${s.kind === 'MOVE' ? 'moves' : 'parcels'}/${s.parcelId}`} className="font-mono hover:underline">
                          {s.code}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{t(s.kind === 'MOVE' ? 'reports:cash.move' : 'reports:cash.parcel')}</span>
                      </TableCell>
                      <TableCell>
                        {t(`common:parcelStatus.${s.status}`)}
                        {s.npPaidStorageFrom && (
                          <span className="block text-xs font-medium text-destructive">{t('reports:stuck.paidStorage', { date: formatDate(s.npPaidStorageFrom) })}</span>
                        )}
                      </TableCell>
                      <TableCell>{s.where ?? '—'}</TableCell>
                      <TableCell>{s.clientName ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(s.changedAt)}</TableCell>
                      <TableCell className={daysClass(s.days, 14, 30)}>{s.days}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
