import { ChevronDown, ChevronRight, HandCoins, Percent, Trash2 } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAccess } from '@/features/auth/access'
import { showApiError } from '@/lib/api/problem'
import type { Currency, DriverSettlement, SettlementLine } from '@/lib/api/types'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { downloadDrivers, type Period, useDeletePayout, useDriversReport } from './api'
import { PayoutDialog, RateDialog } from './DriverPayDialogs'
import { rateSummary } from './driverPay'
import { PeriodBar } from './PeriodBar'
import { presetPeriod } from './period'

/** «Водії»: what each driver earned by their rate, spent of their own, was paid, and what is owed now. */
export function DriversReport() {
  const { t } = useTranslation(['reports', 'common'])
  const { canEdit } = useAccess()
  const [period, setPeriod] = useState<Period>(() => presetPeriod('month'))
  const query = useDriversReport(period)
  const r = query.data
  const rc = (r?.reportCurrency ?? 'UAH') as Currency
  const [open, setOpen] = useState<number | null>(null)
  const [rating, setRating] = useState<DriverSettlement | null>(null)
  const [paying, setPaying] = useState<DriverSettlement | null>(null)
  const [showIdle, setShowIdle] = useState(false)
  // a driver with no rate and nothing in the period or owed waits below, so the list stays short
  const busy = (d: DriverSettlement) => !!d.rate || !!d.rates?.length || !!d.lines?.length || (d.closing ?? 0) !== 0
  const idle = (r?.drivers ?? []).filter((d) => !busy(d))
  const shown = showIdle ? (r?.drivers ?? []) : (r?.drivers ?? []).filter(busy)

  return (
    <div className="flex flex-col gap-4">
      <PeriodBar period={period} onChange={setPeriod} onExcel={() => downloadDrivers(period)} />
      {query.isPending || !r ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label={t('reports:drivers.accrued')} value={formatMoney(r.accruedReport, rc)} />
            <Stat label={t('reports:drivers.paid')} value={formatMoney(r.paidReport, rc)} />
            <Stat
              label={t('reports:drivers.owedTotal')}
              value={formatMoney(r.closingReport, rc)}
              hint={t('reports:drivers.owedTotalHint')}
              danger={(r.closingReport ?? 0) < 0}
              testId="drivers-owed"
            />
          </div>
          {r.rateMissing && (
            <Alert>
              <AlertDescription>{t('reports:cash.rateMissing', { currency: rc })}</AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports:drivers.title')}</CardTitle>
              <CardDescription>{t('reports:drivers.hint')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!r.drivers?.length ? (
                <p className="text-sm text-muted-foreground">{t('reports:drivers.empty')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reports:drivers.driver')}</TableHead>
                      <TableHead className="text-right">{t('reports:drivers.opening')}</TableHead>
                      <TableHead className="text-right">{t('reports:drivers.accrued')}</TableHead>
                      <TableHead className="text-right">{t('reports:drivers.expenses')}</TableHead>
                      <TableHead className="text-right">{t('reports:drivers.paid')}</TableHead>
                      <TableHead className="text-right">{t('reports:drivers.closing')}</TableHead>
                      {canEdit && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.map((d) => {
                      const c = d.currency as Currency
                      const expanded = open === d.userId
                      return (
                        <Fragment key={d.userId}>
                          <TableRow className="cursor-pointer" onClick={() => setOpen(expanded ? null : d.userId!)} data-testid="driver-row">
                            <TableCell className="whitespace-normal">
                              <span className="flex items-start gap-1">
                                {expanded ? <ChevronDown className="mt-0.5 size-4 shrink-0" /> : <ChevronRight className="mt-0.5 size-4 shrink-0" />}
                                <span>
                                  <span className="font-medium">{d.name}</span>
                                  <span className={cn('block text-xs', d.rate ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400')}>
                                    {rateSummary(t, d.rate)}
                                  </span>
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(d.opening, c)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(d.accrued, c)}
                              <span className="block text-xs text-muted-foreground">{t('reports:drivers.tripsCount', { count: d.trips ?? 0 })}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{d.expenses ? formatMoney(d.expenses, c) : '—'}</TableCell>
                            <TableCell className="text-right tabular-nums">{d.paid ? formatMoney(d.paid, c) : '—'}</TableCell>
                            <TableCell className={cn('text-right font-semibold tabular-nums', (d.closing ?? 0) < 0 && 'text-destructive')}>
                              {moved(d) ? formatMoney(d.closing, c) : '—'}
                              {/* a bare zero reads as nothing earned: say it is all paid out */}
                              {moved(d) && (
                                <span className="block text-xs font-normal text-muted-foreground">
                                  {(d.closing ?? 0) > 0 ? t('reports:drivers.owed') : (d.closing ?? 0) < 0 ? t('reports:drivers.overpaid') : t('reports:drivers.settled')}
                                </span>
                              )}
                            </TableCell>
                            {canEdit && (
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="outline" onClick={() => setRating(d)}>
                                    <Percent />
                                    {t('reports:drivers.rate')}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setPaying(d)}>
                                    <HandCoins />
                                    {t('reports:drivers.pay')}
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                          {expanded && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={canEdit ? 7 : 6} className="bg-muted/40 p-3">
                                <Lines driver={d} canEdit={canEdit} />
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
              {idle.length > 0 && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowIdle(!showIdle)}>
                  {showIdle ? t('reports:drivers.hideIdle') : t('reports:drivers.showIdle', { count: idle.length })}
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {rating && <RateDialog driver={rating} onClose={() => setRating(null)} />}
      {paying && <PayoutDialog driver={paying} onClose={() => setPaying(null)} />}
    </div>
  )
}

/** Anything was earned, spent or paid, now or before: a zero then means all paid out. */
const moved = (d: DriverSettlement) => [d.opening, d.accrued, d.expenses, d.paid, d.closing].some((v) => (v ?? 0) !== 0)

/** One driver's period line by line: trips with the parts of their pay, the monthly wage, own expenses, payouts. */
function Lines({ driver, canEdit }: { driver: DriverSettlement; canEdit: boolean }) {
  const { t } = useTranslation(['reports', 'common'])
  const remove = useDeletePayout()
  const [removing, setRemoving] = useState<SettlementLine | null>(null)
  const c = driver.currency as Currency
  if (!driver.lines?.length) return <p className="text-sm text-muted-foreground">{t('reports:drivers.noLines')}</p>
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('reports:drivers.date')}</TableHead>
            <TableHead>{t('reports:drivers.what')}</TableHead>
            <TableHead>{t('reports:drivers.howHeader')}</TableHead>
            <TableHead className="text-right">{t('reports:drivers.sum')}</TableHead>
            {canEdit && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {driver.lines.map((l, i) => {
            const lc = l.currency as Currency
            return (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap">{formatDate(l.date)}</TableCell>
                <TableCell className="whitespace-normal">
                  {l.kind === 'TRIP' || l.kind === 'EXPENSE' ? (
                    <>
                      <Link to={`/trips/${l.tripId}`} className="font-medium hover:underline">
                        {t(l.kind === 'TRIP' ? 'reports:drivers.kind.TRIP' : 'reports:drivers.kind.EXPENSE', { number: l.tripNumber })}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {[l.label, l.coDriver ? t('reports:drivers.coDriver') : null].filter(Boolean).join(' · ')}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{t(`reports:drivers.kind.${l.kind}`)}</span>
                      {(l.label || l.fromCollectedCash) && (
                        <span className="block text-xs text-muted-foreground">
                          {[l.fromCollectedCash ? t('reports:drivers.fromCashShort') : null, l.label].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal text-sm text-muted-foreground">{how(t, l)}</TableCell>
                <TableCell className={cn('text-right tabular-nums', (l.balanceAmount ?? 0) < 0 && 'text-destructive')}>
                  <span className="font-medium">{formatMoney(l.balanceAmount, c)}</span>
                  {lc !== c && <span className="block text-xs text-muted-foreground">{formatMoney(l.amount, lc)}</span>}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    {l.kind === 'PAYOUT' && (
                      <Button size="icon" variant="ghost" aria-label={t('common:actions.delete')} onClick={() => setRemoving(l)}>
                        <Trash2 />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <ConfirmDialog
        open={removing != null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t('reports:drivers.deletePayout')}
        description={removing ? `${driver.name}: ${formatMoney(removing.amount, removing.currency as Currency)}, ${formatDate(removing.date)}` : undefined}
        confirmLabel={t('common:actions.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(removing!.payoutId!)
            setRemoving(null)
          } catch (e) {
            showApiError(e)
          }
        }}
      />
    </>
  )
}

/** How a line's sum came about: «50 € за рейс + 1 240 км × … + 3 дні». */
function how(t: (k: string, o?: Record<string, unknown>) => string, l: SettlementLine): string {
  const lc = l.currency as Currency
  if (l.kind === 'TRIP') {
    if (l.noRate) return t('reports:drivers.noRateThen')
    const parts = [
      l.perTripPart != null ? t('reports:drivers.how.perTrip', { amount: formatMoney(l.perTripPart, lc) }) : null,
      l.kmPart != null
        ? l.km == null
          ? t('reports:drivers.how.noKm')
          : t('reports:drivers.how.km', { km: l.km.toLocaleString('uk-UA'), amount: formatMoney(l.kmPart, lc) })
        : null,
      l.percentPart != null ? t('reports:drivers.how.percent', { amount: formatMoney(l.percentPart, lc) }) : null,
      l.dayPart != null ? t('reports:drivers.how.days', { count: l.days ?? 0, amount: formatMoney(l.dayPart, lc) }) : null,
    ]
    return parts.filter(Boolean).join(' + ')
  }
  if (l.kind === 'MONTHLY') return t('reports:drivers.how.monthly', { days: l.days, of: l.monthDays })
  if (l.kind === 'EXPENSE') return t('reports:drivers.how.expense')
  return ''
}

function Stat({ label, value, hint, danger, testId }: { label: string; value: string; hint?: string; danger?: boolean; testId?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-semibold tabular-nums', danger && 'text-destructive')} data-testid={testId}>
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
