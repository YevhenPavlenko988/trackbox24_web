import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Currency } from '@/lib/api/types'
import { formatDate, formatMoney, formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'
import { downloadReport, type Period, useMovesReport } from './api'
import { PeriodBar } from './PeriodBar'
import { presetPeriod } from './period'
import { Stat } from './Stat'

const SHOWN = 30

const hours = (v?: number) => `${(v ?? 0).toLocaleString('uk-UA')} год`

/** «Переїзди»: what the moves of the period bring after the loaders; how much each loader worked and is owed. */
export function MovesReport() {
  const { t } = useTranslation(['reports', 'common'])
  const [period, setPeriod] = useState<Period>(() => presetPeriod('month'))
  const [all, setAll] = useState(false)
  const query = useMovesReport(period)
  const r = query.data
  const rc = (r?.reportCurrency ?? 'UAH') as Currency

  return (
    <div className="flex flex-col gap-4">
      <PeriodBar period={period} onChange={setPeriod} onExcel={() => downloadReport('moves', period)} />
      {query.isPending || !r ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t('reports:moves.count')} value={String(r.moves ?? 0)} testId="moves-count" />
            <Stat label={t('reports:moves.revenue')} value={formatMoney(r.revenueReport, rc)} hint={t('reports:moves.paidOf', { amount: formatMoney(r.paidReport, rc) })} />
            <Stat label={t('reports:moves.loaders')} value={formatMoney(r.loadersReport, rc)} />
            <Stat label={t('reports:moves.margin')} value={formatMoney(r.marginReport, rc)} hint={t('reports:moves.marginHint')} danger={(r.marginReport ?? 0) < 0} />
          </div>
          {r.rateMissing && (
            <Alert>
              <AlertDescription>{t('reports:cash.rateMissing', { currency: rc })}</AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports:moves.loadersTitle')}</CardTitle>
              <CardDescription>
                {t('reports:moves.loadersHint')}
                {(r.loadersUnpaidReport ?? 0) > 0 && (
                  <span className="mt-1 block font-medium text-foreground">{t('reports:moves.unpaidTotal', { amount: formatMoney(r.loadersUnpaidReport, rc) })}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!r.loaders?.length ? (
                <p className="text-sm text-muted-foreground">{t('reports:moves.noLoaders')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reports:moves.loader')}</TableHead>
                      <TableHead className="text-right">{t('reports:moves.hours')}</TableHead>
                      <TableHead className="text-right">{t('reports:moves.earned')}</TableHead>
                      <TableHead className="text-right">{t('reports:moves.paid')}</TableHead>
                      <TableHead className="text-right">{t('reports:moves.unpaid')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.loaders.map((l) => (
                      <TableRow key={l.loaderId}>
                        <TableCell>
                          <span className="font-medium">{l.name ?? '—'}</span>
                          {l.phone && <span className="block text-xs text-muted-foreground">{formatPhone(l.phone)}</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {hours(l.hours)}
                          <span className="block text-xs text-muted-foreground">{t('reports:moves.works', { count: l.works ?? 0 })}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{l.earnedReport ? formatMoney(l.earnedReport, rc) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{l.paidReport ? formatMoney(l.paidReport, rc) : '—'}</TableCell>
                        <TableCell className={cn('text-right tabular-nums', (l.unpaidReport ?? 0) > 0 && 'font-semibold')}>
                          {(l.unpaid ?? []).length ? (l.unpaid ?? []).map((a) => formatMoney(a.amount, a.currency as Currency)).join(' + ') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('reports:moves.list')}</CardTitle>
              <CardDescription>{t('reports:moves.listHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!r.rows?.length ? (
                <p className="text-sm text-muted-foreground">{t('reports:moves.empty')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reports:cash.move')}</TableHead>
                      <TableHead>{t('reports:debts.client')}</TableHead>
                      <TableHead className="text-right">{t('reports:moves.bill')}</TableHead>
                      <TableHead className="text-right">{t('reports:moves.due')}</TableHead>
                      <TableHead className="text-right">{t('reports:moves.loaders')}</TableHead>
                      <TableHead className="text-right">{t('reports:moves.margin')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(all ? r.rows : r.rows.slice(0, SHOWN)).map((m) => {
                      const c = m.currency as Currency
                      return (
                        <TableRow key={m.parcelId}>
                          <TableCell>
                            <Link to={`/moves/${m.parcelId}`} className="font-mono hover:underline">
                              {m.code}
                            </Link>
                            <span className="block text-xs text-muted-foreground">
                              {formatDate(m.createdAt)} · {t(`common:parcelStatus.${m.status}`)}
                            </span>
                          </TableCell>
                          <TableCell>{m.clientName ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(m.total, c)}</TableCell>
                          <TableCell className={cn('text-right tabular-nums', (m.due ?? 0) > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                            {(m.due ?? 0) > 0 ? formatMoney(m.due, c) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.loaders ? formatMoney(m.loaders, c) : '—'}
                            {!!m.loaderHours && <span className="block text-xs text-muted-foreground">{hours(m.loaderHours)}</span>}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatMoney(m.margin, c)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
              {(r.rows?.length ?? 0) > SHOWN && (
                <button type="button" className="mt-2 text-sm font-medium hover:underline" onClick={() => setAll(!all)}>
                  {all ? t('reports:clients.showLess') : t('reports:cash.showAll', { count: r.rows?.length ?? 0 })}
                </button>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
