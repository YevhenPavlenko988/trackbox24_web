import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Currency } from '@/lib/api/types'
import { formatDate, formatMoney, formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'
import { downloadDebts, useDebts } from './api'
import { ExcelButton } from './PeriodBar'
import { ShareBar } from './ShareBar'

const AGES = ['UP_TO_7', 'UP_TO_30', 'OVER_30'] as const
/** The backend's buckets: up to 7 days, 8–30, over 30. */
const ageOf = (days = 0): (typeof AGES)[number] => (days <= 7 ? 'UP_TO_7' : days <= 30 ? 'UP_TO_30' : 'OVER_30')

/** Handed over and not paid: totals by how long ago, then every parcel and move from the oldest. */
export function DebtsReport() {
  const { t } = useTranslation(['reports', 'common'])
  const query = useDebts()
  const r = query.data
  const rc = (r?.reportCurrency ?? 'UAH') as Currency

  if (query.isPending || !r) return <Skeleton className="h-60 w-full" />

  return (
    <div className="flex flex-col gap-4">
      {/* the total and how old it is: each age's share of the total as a bar, in the report currency */}
      <Card>
        <CardContent className="grid gap-6 md:grid-cols-[minmax(0,16rem)_1fr] md:items-center">
          <div>
            <p className="text-sm text-muted-foreground">{t('reports:debts.total')}</p>
            <p className="text-3xl font-semibold tabular-nums" data-testid="debts-total">
              {formatMoney(r.reportTotal, rc)}
            </p>
            <p className="text-xs text-muted-foreground">{t('reports:debts.totalHint', { currency: rc })}</p>
          </div>
          <div className="flex flex-col gap-3">
            {AGES.map((age) => {
              const buckets = (r.buckets ?? []).filter((b) => b.age === age)
              const rows = (r.rows ?? []).filter((d) => ageOf(d.days) === age)
              const inReport = rows.reduce((n, d) => n + (d.reportAmount ?? 0), 0)
              const share = r.reportTotal ? Math.round((inReport / r.reportTotal) * 100) : 0
              const moves = rows.filter((d) => d.kind === 'MOVE').length
              const parcels = rows.length - moves
              const late = age === 'OVER_30' && rows.length > 0
              return (
                <ShareBar
                  key={age}
                  label={t(`reports:debts.age.${age}`)}
                  note={rows.length > 0 && [parcels > 0 && t('reports:debts.parcels', { count: parcels }), moves > 0 && t('reports:debts.moves', { count: moves })].filter(Boolean).join(' · ')}
                  value={
                    <>
                      {rows.length ? formatMoney(Math.round(inReport * 100) / 100, rc) : t('reports:debts.none')}
                      {buckets.some((b) => b.currency !== rc) && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{buckets.map((b) => formatMoney(b.amount, b.currency as Currency)).join(' + ')}</span>
                      )}
                    </>
                  }
                  share={share}
                  present={rows.length > 0}
                  alarm={late}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>
      {r.rateMissing && (
        <Alert>
          <AlertDescription>{t('reports:debts.rateMissing', { currency: rc })}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>{t('reports:debts.list')}</CardTitle>
            <CardDescription>{t('reports:debts.listHint')}</CardDescription>
          </div>
          <ExcelButton onClick={downloadDebts} />
        </CardHeader>
        <CardContent>
          {!r.rows?.length ? (
            <p className="text-sm text-muted-foreground">{t('reports:debts.empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports:debts.what')}</TableHead>
                  <TableHead>{t('reports:debts.client')}</TableHead>
                  <TableHead>{t('reports:debts.deliveredAt')}</TableHead>
                  <TableHead className="text-right">{t('reports:debts.days')}</TableHead>
                  <TableHead className="text-right">{t('reports:debts.amount')}</TableHead>
                  <TableHead className="text-right">{rc}</TableHead>
                  <TableHead>{t('reports:debts.deliveredBy')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.rows.map((d) => (
                  <TableRow key={`${d.kind}-${d.parcelId}`}>
                    <TableCell>
                      <Link to={`/${d.kind === 'MOVE' ? 'moves' : 'parcels'}/${d.parcelId}`} className="font-mono hover:underline">
                        {d.code}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{t(d.kind === 'MOVE' ? 'reports:cash.move' : 'reports:cash.parcel')}</span>
                    </TableCell>
                    <TableCell>
                      {d.clientId ? (
                        <Link to={`/clients/${d.clientId}`} className="hover:underline">
                          {d.clientName}
                        </Link>
                      ) : (
                        '—'
                      )}
                      {d.clientPhone && <span className="block text-xs text-muted-foreground">{formatPhone(d.clientPhone)}</span>}
                    </TableCell>
                    <TableCell>{formatDate(d.deliveredAt)}</TableCell>
                    <TableCell
                      className={cn('text-right tabular-nums', (d.days ?? 0) > 30 ? 'font-semibold text-destructive' : (d.days ?? 0) > 7 && 'text-amber-700 dark:text-amber-400')}
                    >
                      {d.days}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatMoney(d.amount, d.currency as Currency)}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{d.reportAmount == null ? '—' : formatMoney(d.reportAmount, rc)}</TableCell>
                    <TableCell>{d.deliveredBy ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
