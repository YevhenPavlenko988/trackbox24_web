import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Currency, TripGroupRow } from '@/lib/api/types'
import { formatDate, formatMoney, formatWeight } from '@/lib/format'
import { downloadTrips, type Period, useTripsReport } from './api'
import { PeriodBar } from './PeriodBar'
import { presetPeriod } from './period'

const km = (v?: number) => (v == null ? '—' : `${v.toLocaleString('uk-UA')} км`)

/** The trips that left in the period: what they carried, earned and drove; totals by car and by driver. */
export function TripsReport() {
  const { t } = useTranslation(['reports', 'common', 'trips'])
  const [period, setPeriod] = useState<Period>(() => presetPeriod('month'))
  const query = useTripsReport(period)
  const r = query.data
  const rc = (r?.reportCurrency ?? 'UAH') as Currency
  const perKm = (v?: number) => (v == null ? '—' : `${formatMoney(v, rc)} / км`)

  return (
    <div className="flex flex-col gap-4">
      <PeriodBar period={period} onChange={setPeriod} onExcel={() => downloadTrips(period)} />
      {query.isPending || !r ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label={t('reports:trips.trips')} value={String(r.total?.trips ?? 0)} testId="trips-count" />
            <Stat label={t('reports:trips.km')} value={km(r.total?.km)} />
            <Stat label={t('reports:trips.revenue')} value={formatMoney(r.total?.revenueReport, rc)} hint={t('reports:trips.revenueHint')} />
            <Stat label={t('reports:trips.received')} value={formatMoney(r.total?.receivedReport, rc)} />
            <Stat label={t('reports:trips.perKm')} value={perKm(r.total?.perKm)} />
          </div>
          {r.rateMissing && (
            <Alert>
              <AlertDescription>{t('reports:cash.rateMissing', { currency: rc })}</AlertDescription>
            </Alert>
          )}
          {!r.trips?.length ? (
            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t('reports:trips.empty')}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid items-start gap-4 xl:grid-cols-2">
                <Groups title={t('reports:trips.byCar')} rows={r.byCar ?? []} rc={rc} perKm={perKm} />
                <Groups title={t('reports:trips.byDriver')} rows={r.byDriver ?? []} rc={rc} perKm={perKm} />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports:trips.list')}</CardTitle>
                  <CardDescription>{t('reports:trips.listHint')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports:trips.trip')}</TableHead>
                        <TableHead>{t('reports:trips.carDriver')}</TableHead>
                        <TableHead>{t('reports:trips.departed')}</TableHead>
                        <TableHead className="text-right">{t('reports:trips.carried')}</TableHead>
                        <TableHead className="text-right">{t('reports:trips.delivered')}</TableHead>
                        <TableHead className="text-right">{t('reports:trips.km')}</TableHead>
                        <TableHead className="text-right">{t('reports:trips.revenue')}</TableHead>
                        <TableHead className="text-right">{t('reports:trips.received')}</TableHead>
                        <TableHead className="text-right">{t('reports:trips.perKm')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.trips.map((trip) => (
                        <TableRow key={trip.tripId}>
                          <TableCell>
                            <Link to={`/trips/${trip.tripId}`} className="font-medium hover:underline">
                              №{trip.number}
                            </Link>
                            <span className="block text-xs text-muted-foreground">{trip.route}</span>
                          </TableCell>
                          <TableCell>
                            {trip.carPlate ?? '—'}
                            <span className="block text-xs text-muted-foreground">{[trip.driverName, trip.coDriverName].filter(Boolean).join(', ') || '—'}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(trip.departedAt)}
                            <span className="block text-xs text-muted-foreground">{t(`trips:status.${trip.status}`)}</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {[t('reports:debts.parcels', { count: trip.parcels ?? 0 }), trip.moves ? t('reports:debts.moves', { count: trip.moves }) : null].filter(Boolean).join(' · ')}
                            <span className="block text-xs text-muted-foreground">
                              {t('reports:trips.seats', { count: trip.seats ?? 0 })}
                              {(trip.weightKg ?? 0) > 0 && ` · ${formatWeight(trip.weightKg)}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{trip.delivered}</TableCell>
                          <TableCell className="text-right tabular-nums">{km(trip.km)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span className="font-medium">{formatMoney(trip.revenueReport, rc)}</span>
                            {(trip.revenue ?? []).some((a) => a.currency !== rc) && (
                              <span className="block text-xs text-muted-foreground">
                                {(trip.revenue ?? []).map((a) => formatMoney(a.amount, a.currency as Currency)).join(' + ')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(trip.receivedReport, rc)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{perKm(trip.perKm)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums" data-testid={testId}>
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function Groups({ title, rows, rc, perKm }: { title: string; rows: TripGroupRow[]; rc: Currency; perKm: (v?: number) => string }) {
  const { t } = useTranslation('reports')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead className="text-right">{t('trips.trips')}</TableHead>
              <TableHead className="text-right">{t('trips.km')}</TableHead>
              <TableHead className="text-right">{t('trips.revenue')}</TableHead>
              <TableHead className="text-right">{t('trips.perKm')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((g) => (
              <TableRow key={g.id ?? 'none'}>
                <TableCell className="font-medium">{g.name ?? t('trips.unassigned')}</TableCell>
                <TableCell className="text-right tabular-nums">{g.trips}</TableCell>
                <TableCell className="text-right tabular-nums">{km(g.km)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(g.revenueReport, rc)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{perKm(g.perKm)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
