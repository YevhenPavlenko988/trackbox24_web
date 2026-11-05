import { Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAccess } from '@/features/auth/access'
import { showApiError } from '@/lib/api/problem'
import type { CurrencyRateResponse } from '@/lib/api/types'
import { CURRENCY_SYMBOL, formatDateTime } from '@/lib/format'
import { useRates, useResetRate, useSetRate } from './queries'
import { RatesHistory } from './RatesHistory'

const rate = (v?: number) => (v == null ? '—' : v.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 4 }))

/** «Курси валют»: the banks' rates every hour and the company's own, which wins; a manager or a representative sets it. */
export function RatesPage() {
  const { t } = useTranslation(['currency', 'common'])
  const { canEditRates } = useAccess()
  const query = useRates()
  const reset = useResetRate()
  const [editing, setEditing] = useState<CurrencyRateResponse | null>(null)

  return (
    <>
      <PageHeader title={t('currency:title')} description={t('currency:subtitle')} />
      <Card>
        <CardContent>
          {query.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('currency:currency')}</TableHead>
                  <TableHead className="text-right">{t('currency:bankBuy')}</TableHead>
                  <TableHead className="text-right">{t('currency:bankSell')}</TableHead>
                  <TableHead>{t('currency:bankSource')}</TableHead>
                  <TableHead>{t('currency:companyRate')}</TableHead>
                  <TableHead className="text-right">{t('currency:rate')}</TableHead>
                  {canEditRates && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data ?? []).map((r) => {
                  const symbol = CURRENCY_SYMBOL[r.currency!]
                  const own = r.source === 'COMPANY'
                  return (
                    <TableRow key={r.currency}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {r.currency} · {symbol}
                          </span>
                          <span className="text-xs text-muted-foreground">{t(`currency:names.${r.currency}`)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{rate(r.bankBuy)}</TableCell>
                      <TableCell className="text-right tabular-nums">{rate(r.bankSell)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{r.bankSourceLabel ?? '—'}</span>
                          {r.bankAt && <span className="text-xs text-muted-foreground">{formatDateTime(r.bankAt)}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.companyRate != null ? (
                          <div className="flex flex-col">
                            <span className="font-medium tabular-nums">{rate(r.companyRate)}</span>
                            <span className="text-xs text-muted-foreground">{t('currency:setBy', { name: r.companySetBy ?? '—', at: formatDateTime(r.companySetAt) })}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{t('currency:noCompanyRate')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-base font-bold tabular-nums">{rate(r.rate)}</span>
                          <span className={own ? 'text-xs font-medium text-emerald-700 dark:text-emerald-300' : 'text-xs text-muted-foreground'}>
                            {t(own ? 'currency:fromCompany' : 'currency:fromBank')}
                          </span>
                        </div>
                      </TableCell>
                      {canEditRates && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                              <Pencil />
                              {t(r.companyRate != null ? 'currency:change' : 'currency:set')}
                            </Button>
                            {r.companyRate != null && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={reset.isPending}
                                onClick={async () => {
                                  try {
                                    await reset.mutateAsync(r.currency!)
                                    toast.success(t('common:common.saved'))
                                  } catch (e) {
                                    showApiError(e)
                                  }
                                }}
                              >
                                <RotateCcw />
                                {t('currency:reset')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          {!canEditRates && <p className="mt-3 text-sm text-muted-foreground">{t('currency:readOnly')}</p>}
        </CardContent>
      </Card>
      <RatesHistory />
      {editing && <RateDialog rate={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function RateDialog({ rate: r, onClose }: { rate: CurrencyRateResponse; onClose: () => void }) {
  const { t } = useTranslation(['currency', 'common'])
  const set = useSetRate()
  const [value, setValue] = useState(String(r.companyRate ?? r.rate ?? ''))
  const parsed = Number(value.replace(',', '.'))
  const valid = value.trim() !== '' && Number.isFinite(parsed) && parsed > 0
  const symbol = CURRENCY_SYMBOL[r.currency!]
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('currency:dialogTitle', { currency: `${r.currency} · ${symbol}` })}</DialogTitle>
          <DialogDescription>{t('currency:dialogHint', { symbol, buy: rate(r.bankBuy), sell: rate(r.bankSell) })}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!valid) return
            try {
              await set.mutateAsync({ currency: r.currency!, rate: parsed })
              toast.success(t('common:common.saved'))
              onClose()
            } catch (err) {
              showApiError(err)
            }
          }}
        >
          <div className="flex items-center gap-2">
            <Input id="rate-value" inputMode="decimal" autoFocus value={value} onChange={(e) => setValue(e.target.value)} aria-label={t('currency:perUnit', { symbol })} />
            <span className="text-sm whitespace-nowrap text-muted-foreground">{t('currency:perUnit', { symbol })}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={!valid || set.isPending}>
              {t('common:actions.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
