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
import { ClientsReport } from './ClientsReport'
import { DebtsReport } from './DebtsReport'
import { DriversReport } from './DriversReport'
import { MovesReport } from './MovesReport'
import { NpReport } from './NpReport'
import { StuckReport } from './StuckReport'
import { TripsReport } from './TripsReport'
import { VolumesReport } from './VolumesReport'
import { WarehousesReport } from './WarehousesReport'

const TABS = ['cash', 'debts', 'trips', 'drivers', 'clients', 'moves', 'np', 'volumes', 'warehouses', 'stuck'] as const

/** «Звіти»: the cash of a period and who owes; totals in the company's report currency. */
export function ReportsPage() {
  const { t } = useTranslation(['reports', 'common'])
  const [params, setParams] = useSearchParams()
  const company = useCurrentCompany().data
  // «Переїзди» only where the company does moves
  const tabs = TABS.filter((x) => x !== 'moves' || company?.movesEnabled)
  const tab = tabs.find((x) => x === params.get('tab')) ?? 'cash'

  return (
    <>
      <PageHeader title={t('reports:title')} description={t('reports:subtitle')} actions={<ReportCurrency />} />
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params)
          if (v === 'cash') next.delete('tab')
          else next.set('tab', String(v))
          setParams(next, { replace: true })
        }}
      >
        <TabsList className="flex-wrap">
          {tabs.map((x) => (
            <TabsTrigger key={x} value={x}>
              {t(`reports:tabs.${x}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="cash" className="mt-4">
          <CashReport />
        </TabsContent>
        <TabsContent value="debts" className="mt-4">
          <DebtsReport />
        </TabsContent>
        <TabsContent value="trips" className="mt-4">
          <TripsReport />
        </TabsContent>
        <TabsContent value="drivers" className="mt-4">
          <DriversReport />
        </TabsContent>
        <TabsContent value="clients" className="mt-4">
          <ClientsReport />
        </TabsContent>
        <TabsContent value="moves" className="mt-4">
          <MovesReport />
        </TabsContent>
        <TabsContent value="np" className="mt-4">
          <NpReport />
        </TabsContent>
        <TabsContent value="volumes" className="mt-4">
          <VolumesReport />
        </TabsContent>
        <TabsContent value="warehouses" className="mt-4">
          <WarehousesReport />
        </TabsContent>
        <TabsContent value="stuck" className="mt-4">
          <StuckReport />
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
