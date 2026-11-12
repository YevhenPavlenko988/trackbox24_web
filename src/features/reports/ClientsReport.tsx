import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Currency } from '@/lib/api/types'
import { formatDate, formatMoney, formatPhone } from '@/lib/format'
import { downloadReport, type Period, useClientsReport } from './api'
import { PeriodBar } from './PeriodBar'
import { daysClass, presetPeriod } from './period'
import { ShareBar } from './ShareBar'
import { Stat } from './Stat'

const SHOWN = 30

/** «Клієнти»: who ordered in the period, new or back, from which channel; who has gone quiet. */
export function ClientsReport() {
  const { t } = useTranslation(['reports', 'common'])
  const [period, setPeriod] = useState<Period>(() => presetPeriod('month'))
  const [all, setAll] = useState(false)
  const query = useClientsReport(period)
  const r = query.data
  const rc = (r?.reportCurrency ?? 'UAH') as Currency
  const channel = (c?: string) => (!c || c === 'NONE' ? t('reports:clients.noChannel') : t(`common:channel.${c}`))
  const most = Math.max(1, ...(r?.channels ?? []).map((c) => c.clients ?? 0))
  const clients = r?.clients ?? []

  return (
    <div className="flex flex-col gap-4">
      <PeriodBar period={period} onChange={setPeriod} onExcel={() => downloadReport('clients', period)} />
      {query.isPending || !r ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t('reports:clients.active')} value={String(r.active ?? 0)} testId="clients-active" />
            <Stat label={t('reports:clients.new')} value={String(r.newClients ?? 0)} hint={t('reports:clients.newHint')} />
            <Stat label={t('reports:clients.returning')} value={String(r.returning ?? 0)} hint={t('reports:clients.returningHint')} />
            <Stat label={t('reports:clients.revenue')} value={formatMoney(r.revenueReport, rc)} hint={t('reports:clients.revenueHint')} />
          </div>
          {r.rateMissing && (
            <Alert>
              <AlertDescription>{t('reports:cash.rateMissing', { currency: rc })}</AlertDescription>
            </Alert>
          )}
          {!!r.channels?.length && (
            <Card>
              <CardHeader>
                <CardTitle>{t('reports:clients.channels')}</CardTitle>
                <CardDescription>{t('reports:clients.channelsHint')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {r.channels.map((c) => (
                  <ShareBar
                    key={c.channel}
                    label={channel(c.channel)}
                    note={c.newClients ? t('reports:clients.ofThemNew', { count: c.newClients }) : undefined}
                    value={`${t('reports:clients.count', { count: c.clients ?? 0 })} · ${formatMoney(c.revenueReport, rc)}`}
                    share={((c.clients ?? 0) / most) * 100}
                  />
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports:clients.list')}</CardTitle>
              <CardDescription>{t('reports:clients.listHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!clients.length ? (
                <p className="text-sm text-muted-foreground">{t('reports:clients.empty')}</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports:debts.client')}</TableHead>
                        <TableHead>{t('reports:clients.channel')}</TableHead>
                        <TableHead className="text-right">{t('reports:clients.orders')}</TableHead>
                        <TableHead className="text-right">{t('reports:clients.revenueCol')}</TableHead>
                        <TableHead className="text-right">{t('reports:clients.paid')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(all ? clients : clients.slice(0, SHOWN)).map((c) => (
                        <TableRow key={c.clientId}>
                          <TableCell>
                            <Link to={`/clients/${c.clientId}`} className="font-medium hover:underline">
                              {c.name}
                            </Link>
                            {c.isNew && (
                              <Badge variant="secondary" className="ml-2">
                                {t('reports:clients.newBadge')}
                              </Badge>
                            )}
                            {c.phone && <span className="block text-xs text-muted-foreground">{formatPhone(c.phone)}</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{channel(c.channel)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {[c.parcels ? t('reports:debts.parcels', { count: c.parcels }) : null, c.moves ? t('reports:debts.moves', { count: c.moves }) : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatMoney(c.revenueReport, rc)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(c.paidReport, rc)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {clients.length > SHOWN && (
                    <button type="button" className="mt-2 text-sm font-medium hover:underline" onClick={() => setAll(!all)}>
                      {all ? t('reports:clients.showLess') : t('reports:cash.showAll', { count: clients.length })}
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('reports:clients.dormant')}</CardTitle>
              <CardDescription>{t('reports:clients.dormantHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!r.dormant?.length ? (
                <p className="text-sm text-muted-foreground">{t('reports:clients.dormantEmpty')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reports:debts.client')}</TableHead>
                      <TableHead className="text-right">{t('reports:clients.ordersEver')}</TableHead>
                      <TableHead>{t('reports:clients.lastOrder')}</TableHead>
                      <TableHead className="text-right">{t('reports:debts.days')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.dormant.map((c) => (
                      <TableRow key={c.clientId}>
                        <TableCell>
                          <Link to={`/clients/${c.clientId}`} className="font-medium hover:underline">
                            {c.name}
                          </Link>
                          {c.phone && <span className="block text-xs text-muted-foreground">{formatPhone(c.phone)}</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{c.orders}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(c.lastOrderAt)}</TableCell>
                        <TableCell className={daysClass(c.days, 90, 180)}>{c.days}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
