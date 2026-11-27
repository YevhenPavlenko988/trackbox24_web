import { Plus, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PERIOD_PRESETS, presetOf, presetPeriod } from '@/features/reports/period'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { BillingPaymentResponse } from '@/lib/api/types'
import type { PaymentFilters } from './api'
import { CompanySelect } from './CompanySelect'
import { formatEur } from './format'
import { PaymentDialog } from './PaymentDialog'
import { PaymentMethodsDialog } from './PaymentMethodsDialog'
import { PaymentsTable } from './PaymentsTable'
import { usePaymentMethods, usePayments, usePaymentsSummary } from './queries'

const ALL = '__all__'

/** What clients paid us: the ledger over days, a client and a way of paying, with the totals by way. */
export function PaymentsPage() {
  const { t } = useTranslation(['billing', 'reports'])
  const { page, size, setPage, setSize, get, set } = useListParams({ size: 50 })
  const month = presetPeriod('month')
  const period = { from: get('from') ?? month.from, to: get('to') ?? month.to }
  const companyId = get('company') ? Number(get('company')) : undefined
  const methodId = get('method') ? Number(get('method')) : undefined
  const filters: PaymentFilters = { ...period, companyId, methodId }
  const query = usePayments({ ...filters, page, size })
  const summary = usePaymentsSummary(filters).data
  const methods = usePaymentMethods().data ?? []
  const data = query.data ?? emptyPage<BillingPaymentResponse>()
  const [adding, setAdding] = useState(false)
  const [editingMethods, setEditingMethods] = useState(false)
  const preset = presetOf(period)
  const setPeriod = (p: { from: string; to: string }) => set({ from: p.from === month.from ? undefined : p.from, to: p.to === month.to ? undefined : p.to })
  const top = Math.max(0, ...(summary?.byMethod ?? []).map((m) => m.amountEur ?? 0))

  return (
    <>
      <PageHeader
        title={t('billing:payments.title')}
        description={t('billing:payments.subtitle')}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditingMethods(true)}>
              <Wallet />
              {t('billing:methods.title')}
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus />
              {t('billing:payment.add')}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap gap-1" role="group">
          {PERIOD_PRESETS.map((p) => (
            <Button key={p} size="sm" variant={preset === p ? 'default' : 'outline'} onClick={() => setPeriod(presetPeriod(p))}>
              {t(`reports:period.${p}`)}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {t('reports:period.from')}
          <Input type="date" className="w-40" value={period.from} max={period.to} onChange={(e) => e.target.value && setPeriod({ ...period, from: e.target.value })} />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {t('reports:period.to')}
          <Input type="date" className="w-40" value={period.to} min={period.from} onChange={(e) => e.target.value && setPeriod({ ...period, to: e.target.value })} />
        </label>
        <CompanySelect
          className="w-56 justify-between font-normal"
          value={companyId}
          allLabel={t('billing:payments.allCompanies')}
          onChange={(id) => set({ company: id })}
        />
        <Select value={methodId != null ? String(methodId) : ALL} onValueChange={(v) => set({ method: v && v !== ALL ? v : undefined })}>
          <SelectTrigger className="w-52" aria-label={t('billing:payment.method')}>
            <SelectValue>{methods.find((m) => m.id === methodId)?.name ?? t('billing:payments.allMethods')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('billing:payments.allMethods')}</SelectItem>
            {methods.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('billing:payments.received')}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums" data-testid="payments-total">
              {formatEur(summary?.totalEur ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">{t('billing:payments.count', { count: summary?.count ?? 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('billing:payments.byMethod')}</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.byMethod?.length ? (
              <ul className="flex flex-col gap-3">
                {summary.byMethod.map((m) => (
                  <li key={m.method?.id ?? 'none'} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
                    <span className="truncate">{m.method?.name ?? t('billing:payment.unknownMethod')}</span>
                    <span className="h-1.5 rounded-full bg-muted" role="presentation">
                      <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${top > 0 ? Math.max(((m.amountEur ?? 0) / top) * 100, 3) : 0}%` }} />
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="font-medium">{formatEur(m.amountEur)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{t('billing:payments.count', { count: m.count ?? 0 })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('billing:payments.empty')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <PaymentsTable payments={data.content} isLoading={query.isPending} />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>

      {adding && <PaymentDialog onOpenChange={setAdding} />}
      <PaymentMethodsDialog open={editingMethods} onOpenChange={setEditingMethods} />
    </>
  )
}
