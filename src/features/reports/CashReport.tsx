import { HandCoins, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
import type { CashEntry, CashOnHand, CashSum, Currency } from '@/lib/api/types'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'
import { downloadCash, type Period, useCashReport, useDeleteHandover } from './api'
import { HandoverDialog } from './HandoverDialog'
import { PeriodBar } from './PeriodBar'
import { ShareBar } from './ShareBar'
import { presetPeriod } from './period'

const FIRST_PAYMENTS = 30

/** What came in over the days chosen: by person, currency and method; the cash still in hand and its handovers. */
export function CashReport() {
  const { t } = useTranslation(['reports', 'common'])
  const { canEdit } = useAccess()
  const [period, setPeriod] = useState<Period>(() => presetPeriod('month'))
  const query = useCashReport(period)
  const remove = useDeleteHandover()
  const [taking, setTaking] = useState<CashOnHand | null>(null)
  const [removing, setRemoving] = useState<{ id: number; name?: string; amount: string } | null>(null)
  const [allPayments, setAllPayments] = useState(false)
  const r = query.data
  const rc = (r?.reportCurrency ?? 'UAH') as Currency
  const method = (m?: string) => (m ? t(`common:paymentMethod.${m}`) : t('reports:cash.methodNone'))

  return (
    <div className="flex flex-col gap-4">
      <PeriodBar period={period} onChange={setPeriod} onExcel={() => downloadCash(period)} />

      {query.isPending || !r ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('reports:cash.total')}</p>
                <p className="text-3xl font-semibold tabular-nums" data-testid="cash-total">
                  {formatMoney(r.reportTotal, rc)}
                </p>
                <p className="text-xs text-muted-foreground">{t('reports:cash.totalHint', { currency: rc })}</p>
                <MethodShares entries={r.entries ?? []} total={r.reportTotal ?? 0} rc={rc} method={method} />
              </div>
              <Sums sums={r.totals ?? []} method={method} />
            </CardContent>
          </Card>
          {r.rateMissing && (
            <Alert>
              <AlertDescription>{t('reports:cash.rateMissing', { currency: rc })}</AlertDescription>
            </Alert>
          )}

          <div className="grid items-start gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports:cash.people')}</CardTitle>
                <CardDescription>{t('reports:cash.peopleHint')}</CardDescription>
              </CardHeader>
              <CardContent>
                {!r.people?.length ? (
                  <p className="text-sm text-muted-foreground">{t('reports:cash.empty')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports:cash.person')}</TableHead>
                        <TableHead>{t('reports:cash.received')}</TableHead>
                        <TableHead className="text-right">{t('reports:cash.inReport', { currency: rc })}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.people.map((p) => (
                        <TableRow key={p.userId ?? 'online'}>
                          <TableCell className="font-medium">{p.name ?? t('reports:cash.online')}</TableCell>
                          <TableCell>
                            <Sums sums={p.sums ?? []} method={method} compact />
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatMoney(p.reportTotal, rc)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports:cash.onHand')}</CardTitle>
                <CardDescription>{t('reports:cash.onHandHint')}</CardDescription>
              </CardHeader>
              <CardContent>
                {!r.onHand?.length ? (
                  <p className="text-sm text-muted-foreground">{t('reports:cash.onHandEmpty')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports:cash.person')}</TableHead>
                        <TableHead className="text-right">{t('reports:cash.taken')}</TableHead>
                        <TableHead className="text-right">{t('reports:cash.handedOver')}</TableHead>
                        <TableHead className="text-right">{t('reports:cash.left')}</TableHead>
                        {canEdit && <TableHead />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.onHand.map((h) => (
                        <TableRow key={`${h.userId}-${h.currency}`}>
                          <TableCell className="font-medium">{h.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(h.taken, h.currency as Currency)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(h.handedOver, h.currency as Currency)}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{formatMoney(h.onHand, h.currency as Currency)}</TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              {(h.onHand ?? 0) > 0 && (
                                <Button size="sm" variant="outline" onClick={() => setTaking(h)}>
                                  <HandCoins />
                                  {t('reports:cash.takeCash')}
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {!!r.handovers?.length && (
            <Card>
              <CardHeader>
                <CardTitle>{t('reports:cash.handovers')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reports:cash.handedAt')}</TableHead>
                      <TableHead>{t('reports:cash.person')}</TableHead>
                      <TableHead className="text-right">{t('reports:cash.amount')}</TableHead>
                      <TableHead>{t('reports:cash.receivedBy')}</TableHead>
                      <TableHead>{t('reports:cash.note')}</TableHead>
                      {canEdit && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.handovers.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{formatDateTime(h.handedAt)}</TableCell>
                        <TableCell className="font-medium">{h.holderName}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(h.amount, h.currency as Currency)}</TableCell>
                        <TableCell>{h.receivedByName ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{h.note ?? ''}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t('common:actions.delete')}
                              onClick={() => setRemoving({ id: h.id!, name: h.holderName, amount: formatMoney(h.amount, h.currency as Currency) })}
                            >
                              <Trash2 />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('reports:cash.payments')}</CardTitle>
              <CardDescription>{t('reports:cash.paymentsCount', { count: r.entries?.length ?? 0 })}</CardDescription>
            </CardHeader>
            <CardContent>
              {!r.entries?.length ? (
                <p className="text-sm text-muted-foreground">{t('reports:cash.empty')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reports:cash.at')}</TableHead>
                      <TableHead>{t('reports:cash.what')}</TableHead>
                      <TableHead>{t('reports:cash.client')}</TableHead>
                      <TableHead>{t('reports:cash.person')}</TableHead>
                      <TableHead>{t('reports:cash.method')}</TableHead>
                      <TableHead className="text-right">{t('reports:cash.amount')}</TableHead>
                      <TableHead className="text-right">{rc}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allPayments ? r.entries : r.entries.slice(0, FIRST_PAYMENTS)).map((e, i) => (
                      <TableRow key={`${e.kind}-${e.parcelId}-${i}`}>
                        <TableCell className="whitespace-nowrap">{e.dateOnly ? formatDate(e.at) : formatDateTime(e.at)}</TableCell>
                        <TableCell>
                          <Link to={`/${e.kind === 'MOVE' ? 'moves' : 'parcels'}/${e.parcelId}`} className="font-mono hover:underline">
                            {e.code}
                          </Link>
                          <span className="block text-xs text-muted-foreground">{t(e.kind === 'MOVE' ? 'reports:cash.move' : 'reports:cash.parcel')}</span>
                        </TableCell>
                        <TableCell>{e.clientName ?? '—'}</TableCell>
                        <TableCell>{e.userName ?? t('reports:cash.online')}</TableCell>
                        <TableCell>{method(e.method)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(e.amount, e.currency as Currency)}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{e.reportAmount == null ? '—' : formatMoney(e.reportAmount, rc)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!allPayments && (r.entries?.length ?? 0) > FIRST_PAYMENTS && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setAllPayments(true)}>
                  {t('reports:cash.showAll', { count: r.entries!.length })}
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {taking && <HandoverDialog onHand={taking} onClose={() => setTaking(null)} />}
      <ConfirmDialog
        open={removing != null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t('reports:cash.deleteHandover')}
        description={removing ? t('reports:cash.deleteHandoverText', { name: removing.name, amount: removing.amount }) : undefined}
        confirmLabel={t('common:actions.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(removing!.id)
            setRemoving(null)
          } catch (e) {
            showApiError(e)
          }
        }}
      />
    </div>
  )
}

/** How the money came: each method's share of the total in the report currency; cash is what someone holds. */
function MethodShares({ entries, total, rc, method }: { entries: CashEntry[]; total: number; rc: Currency; method: (m?: string) => string }) {
  const { t } = useTranslation('reports')
  if (!entries.length || total <= 0) return null
  const sums = new Map<string | undefined, number>()
  for (const e of entries) sums.set(e.method, (sums.get(e.method) ?? 0) + (e.reportAmount ?? 0))
  const lines = [...sums.entries()].sort((a, b) => b[1] - a[1])
  return (
    <div className="mt-5 flex flex-col gap-3 sm:min-w-96">
      <p className="text-sm font-medium">{t('cash.byMethod')}</p>
      {lines.map(([m, sum]) => (
        <ShareBar
          key={m ?? 'none'}
          label={method(m)}
          note={`${Math.round((sum / total) * 100)}%`}
          value={formatMoney(Math.round(sum * 100) / 100, rc)}
          share={(sum / total) * 100}
        />
      ))}
    </div>
  )
}

/**
 * Method lines with their sums; by default grouped under each currency with its subtotal, compact — one plain list
 * (the amount already says the currency).
 */
function Sums({ sums, method, compact }: { sums: CashSum[]; method: (m?: string) => string; compact?: boolean }) {
  const { t } = useTranslation('reports')
  if (!sums.length) return null
  const line = (s: CashSum) => (
    <li key={`${s.currency}-${s.method}`} className="flex justify-between gap-4">
      <span className="text-muted-foreground">{method(s.method)}</span>
      <span className="tabular-nums">
        {formatMoney(s.amount, s.currency as Currency)}
        {!compact && <span className="ml-1 text-xs text-muted-foreground">({t('cash.paymentsCount', { count: s.count ?? 0 })})</span>}
      </span>
    </li>
  )
  if (compact) return <ul className="flex flex-col gap-0.5 text-sm">{sums.map(line)}</ul>
  const currencies = [...new Set(sums.map((s) => s.currency as Currency))]
  return (
    <div className="flex flex-col gap-3 text-sm sm:min-w-80">
      {currencies.map((c) => {
        const of = sums.filter((s) => s.currency === c)
        return (
          <div key={c}>
            <p className="flex justify-between gap-4 font-semibold">
              <span>{c}</span>
              <span className="tabular-nums">{formatMoney(of.reduce((n, s) => n + (s.amount ?? 0), 0), c)}</span>
            </p>
            <ul className="flex flex-col gap-0.5 pl-3">{of.map(line)}</ul>
          </div>
        )
      })}
    </div>
  )
}
