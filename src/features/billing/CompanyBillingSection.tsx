import { AlertTriangle } from 'lucide-react'
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
import { useCompanyBilling, useInvoices, useSetTrial } from './queries'

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
