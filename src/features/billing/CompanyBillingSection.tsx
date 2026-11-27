import { AlertTriangle, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { showApiError } from '@/lib/api/problem'
import type { CompanyBillingResponse } from '@/lib/api/types'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { formatEur, formatPeriod } from './format'
import { InvoiceLines } from './InvoiceLines'
import { InvoicesTable } from './InvoicesTable'
import { PaymentDialog } from './PaymentDialog'
import { PaymentsTable } from './PaymentsTable'
import { useCompanyBalance, useCompanyBilling, useInvoices, usePayments, useSetTrial } from './queries'

/** The money side of a client company: tariff and trial, this month's forecast, its invoices, option history. */
export function CompanyBillingSection({ companyId }: { companyId: number }) {
  const { t } = useTranslation('billing')
  const billing = useCompanyBilling(companyId)
  const invoices = useInvoices({ companyId, size: 100 })
  if (billing.isPending) return <Skeleton className="h-40 w-full" />
  const b = billing.data
  if (!b) return null
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {b.suspendedAt && (
        <Alert variant="destructive" className="lg:col-span-2">
          <AlertTriangle />
          <AlertDescription>{t('company.suspended', { date: formatDateTime(b.suspendedAt) })}</AlertDescription>
        </Alert>
      )}
      <TariffCard companyId={companyId} billing={b} />
      <Card>
        <CardHeader>
          <CardTitle className="first-letter:uppercase">{t('company.forecast', { period: formatPeriod(b.currentMonth) })}</CardTitle>
          <CardDescription>{t('company.forecastHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {b.currentMonthLines?.length ? (
            <InvoiceLines lines={b.currentMonthLines} total={b.currentMonthEur} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('company.forecastEmpty')}</p>
          )}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t('company.invoices')}</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicesTable invoices={invoices.data?.content ?? []} isLoading={invoices.isPending} showCompany={false} />
        </CardContent>
      </Card>
      <PaymentsCard companyId={companyId} />
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t('company.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          {b.optionChanges?.length ? (
            <ul className="flex flex-col gap-2 text-sm">
              {b.optionChanges.map((c, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-2">
                  <span className="text-muted-foreground tabular-nums">{formatDateTime(c.at)}</span>
                  <span className="font-medium">{c.label}</span>
                  <Badge variant="secondary" className={cn(c.enabled ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : '')}>
                    {t(c.enabled ? 'company.on' : 'company.off')}
                  </Badge>
                  <span className="text-muted-foreground">· {c.by ?? t('company.system')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('company.historyEmpty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** What the client was billed and paid: the balance up top, then its payments. */
function PaymentsCard({ companyId }: { companyId: number }) {
  const { t } = useTranslation('billing')
  const balance = useCompanyBalance(companyId).data
  const payments = usePayments({ companyId, size: 100 })
  const [adding, setAdding] = useState(false)
  const b = balance?.balanceEur ?? 0
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <CardTitle>{t('company.payments')}</CardTitle>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus />
          {t('payment.add')}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">{t('company.invoiced')}</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatEur(balance?.invoicedEur)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t('company.paid')}</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatEur(balance?.paidEur)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t(b < 0 ? 'company.debt' : b > 0 ? 'company.overpaid' : 'company.settled')}</dt>
            <dd
              className={cn('text-xl font-semibold tabular-nums', b < 0 && 'text-destructive', b > 0 && 'text-emerald-700 dark:text-emerald-400')}
              data-testid="company-balance"
            >
              {formatEur(Math.abs(b))}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">{t('company.balanceHint')}</p>
        <PaymentsTable payments={payments.data?.content ?? []} isLoading={payments.isPending} showCompany={false} />
      </CardContent>
      {adding && <PaymentDialog companyId={companyId} onOpenChange={setAdding} />}
    </Card>
  )
}

function TariffCard({ companyId, billing }: { companyId: number; billing: CompanyBillingResponse }) {
  const { t } = useTranslation(['billing', 'common'])
  const setTrial = useSetTrial(companyId)
  const [trial, setTrialValue] = useState(billing.trialEndsOn ?? '')
  const save = async (value: string | null) => {
    try {
      await setTrial.mutateAsync(value)
      setTrialValue(value ?? '')
      toast.success(t('billing:toasts.trialSaved'))
    } catch (e) {
      showApiError(e)
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('billing:company.tariff')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-muted-foreground">{t('billing:company.monthly')}</p>
          <p className="text-3xl font-semibold tabular-nums">{formatEur(billing.monthlyEur)}</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t('billing:company.trial')}</p>
          <p className="text-sm">
            {billing.trialEndsOn == null ? (
              <span className="text-muted-foreground">{t('billing:company.noTrial')}</span>
            ) : billing.inTrial ? (
              <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                {t('billing:company.trialUntil', { date: formatDate(billing.trialEndsOn) })}
              </Badge>
            ) : (
              <span className="text-muted-foreground">{t('billing:company.trialEnded', { date: formatDate(billing.trialEndsOn) })}</span>
            )}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm text-muted-foreground">
              {t('billing:company.trialEdit')}
              <Input type="date" className="w-44" value={trial} onChange={(e) => setTrialValue(e.target.value)} />
            </label>
            <Button variant="outline" disabled={!trial || trial === billing.trialEndsOn || setTrial.isPending} onClick={() => save(trial)}>
              {t('common:actions.save')}
            </Button>
            {billing.trialEndsOn != null && (
              <Button variant="ghost" disabled={setTrial.isPending} onClick={() => save(null)}>
                {t('billing:company.removeTrial')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
