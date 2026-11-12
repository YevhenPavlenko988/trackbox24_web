import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAccess } from '@/features/auth/access'
import { useCurrentCompany } from '@/features/companies/queries'
import { showApiError } from '@/lib/api/problem'
import type { Currency } from '@/lib/api/types'
import { CURRENCY_SYMBOL, MONEY_ORDER } from '@/lib/format'
import { useSetReportCurrency } from './api'
import { CashReport } from './CashReport'
import { DebtsReport } from './DebtsReport'

/** «Звіти»: the cash of a period and who owes; totals in the company's report currency. */
export function ReportsPage() {
  const { t } = useTranslation(['reports', 'common'])
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'debts' ? 'debts' : 'cash'

  return (
    <>
      <PageHeader title={t('reports:title')} description={t('reports:subtitle')} actions={<ReportCurrency />} />
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params)
          if (v === 'debts') next.set('tab', 'debts')
          else next.delete('tab')
          setParams(next, { replace: true })
        }}
      >
        <TabsList>
          <TabsTrigger value="cash">{t('reports:tabs.cash')}</TabsTrigger>
          <TabsTrigger value="debts">{t('reports:tabs.debts')}</TabsTrigger>
        </TabsList>
        <TabsContent value="cash" className="mt-4">
          <CashReport />
        </TabsContent>
        <TabsContent value="debts" className="mt-4">
          <DebtsReport />
        </TabsContent>
      </Tabs>
    </>
  )
}

/** The manager picks the currency the totals are counted in; others see it. */
function ReportCurrency() {
  const { t } = useTranslation('reports')
  const { canEdit } = useAccess()
  const company = useCurrentCompany().data
  const set = useSetReportCurrency(company?.id ?? 0)
  const value = (company?.reportCurrency ?? 'UAH') as Currency
  if (!company) return null
  return (
    <div className="flex items-center gap-2 text-sm" title={t('reportCurrencyHint')}>
      <span className="text-muted-foreground">{t('reportCurrency')}</span>
      {canEdit ? (
        <Select
          value={value}
          onValueChange={async (v) => {
            try {
              await set.mutateAsync(v as Currency)
            } catch (e) {
              showApiError(e)
            }
          }}
        >
          <SelectTrigger data-testid="report-currency" disabled={set.isPending}>
            <SelectValue>{`${value} · ${CURRENCY_SYMBOL[value]}`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MONEY_ORDER.map((c) => (
              <SelectItem key={c} value={c}>
                {`${c} · ${CURRENCY_SYMBOL[c]}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="font-medium">{`${value} · ${CURRENCY_SYMBOL[value]}`}</span>
      )}
    </div>
  )
}
