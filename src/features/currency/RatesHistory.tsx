import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { BankRateChangeResponse, CompanyRateChangeResponse, Currency } from '@/lib/api/types'
import { CURRENCY_SYMBOL, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useRateHistory } from './queries'

const CURRENCIES: Currency[] = ['EUR', 'USD', 'PLN']

const rate = (v?: number) => (v == null ? '—' : v.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 4 }))

/** Toggle buttons: one of a few values. */
function Choice<T extends string | number>({ value, options, label, onChange }: { value: T; options: readonly T[]; label: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup">
      {options.map((o) => (
        <Button key={o} type="button" size="sm" role="radio" aria-checked={value === o} variant={value === o ? 'default' : 'outline'} onClick={() => onChange(o)}>
          {label(o)}
        </Button>
      ))}
    </div>
  )
}

/**
 * «Історія курсів» under the rates: when the bank's rate changed (hourly snapshots, repeats folded) and every change of
 * the company's own rate with who made it, ten per page each — so a payment's rate can be checked afterwards.
 */
export function RatesHistory() {
  const { t } = useTranslation('currency')
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [bankPage, setBankPage] = useState(0)
  const [companyPage, setCompanyPage] = useState(0)
  const bankQuery = useRateHistory('bank', currency, bankPage)
  const companyQuery = useRateHistory('company', currency, companyPage)
  const bank = (bankQuery.data?.content ?? []) as BankRateChangeResponse[]
  const company = (companyQuery.data?.content ?? []) as CompanyRateChangeResponse[]
  const pick = (c: Currency) => {
    setCurrency(c)
    setBankPage(0)
    setCompanyPage(0)
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t('history.title')}</CardTitle>
        <CardDescription>{t('history.hint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Choice<Currency> value={currency} options={CURRENCIES} label={(c) => `${c} · ${CURRENCY_SYMBOL[c]}`} onChange={pick} />
        {bankQuery.isPending || companyQuery.isPending ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <section className="min-w-0">
              <p className="mb-2 font-medium">{t('history.bank')}</p>
              {bank.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('history.noBank')}</p>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('history.since')}</TableHead>
                        <TableHead className="text-right">{t('bankBuy')}</TableHead>
                        <TableHead className="text-right">{t('bankSell')}</TableHead>
                        <TableHead>{t('history.source')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bank.map((r, i) => {
                        const older = bank[i + 1]
                        const up = older?.sell != null && r.sell != null ? Math.sign(r.sell - older.sell) : 0
                        return (
                          <TableRow key={r.at}>
                            <TableCell className="tabular-nums">{formatDateTime(r.at)}</TableCell>
                            <TableCell className="text-right tabular-nums">{rate(r.buy)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              <span className={cn(up > 0 && 'text-red-700 dark:text-red-300', up < 0 && 'text-emerald-700 dark:text-emerald-300')}>
                                {up > 0 ? '↑ ' : up < 0 ? '↓ ' : ''}
                                {rate(r.sell)}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{r.sourceLabel}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              {bankQuery.data && bankQuery.data.totalPages > 1 && (
                <div className="mt-2">
                  <Pagination page={bankQuery.data} onPageChange={setBankPage} />
                </div>
              )}
            </section>
            <section className="min-w-0">
              <p className="mb-2 font-medium">{t('history.company')}</p>
              {company.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('history.noCompany')}</p>
              ) : (
                <ul className="divide-y rounded-lg border text-sm">
                  {company.map((r, i) => (
                    <li key={`${r.at}-${i}`} className="flex items-start justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="tabular-nums">{formatDateTime(r.at)}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.setBy ?? '—'}</p>
                      </div>
                      {r.rate != null ? (
                        <span className="font-semibold tabular-nums">{rate(r.rate)}</span>
                      ) : (
                        <span className="text-muted-foreground">{t('history.backToBank')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {companyQuery.data && companyQuery.data.totalPages > 1 && (
                <div className="mt-2">
                  <Pagination page={companyQuery.data} onPageChange={setCompanyPage} />
                </div>
              )}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
