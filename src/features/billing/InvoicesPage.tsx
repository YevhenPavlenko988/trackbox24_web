import { FilePlus2, Tags } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { InvoiceResponse, InvoiceStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import type { InvoiceFilters } from './api'
import { formatEur } from './format'
import { GenerateDialog } from './GenerateDialog'
import { InvoicesTable } from './InvoicesTable'
import { PricesDialog } from './PricesDialog'
import { useInvoices, useInvoiceSummary } from './queries'

const FILTERS: Record<string, { status?: InvoiceStatus[]; overdue?: boolean }> = {
  all: {},
  draft: { status: ['DRAFT'] },
  unpaid: { status: ['SENT'] },
  overdue: { overdue: true },
  paid: { status: ['PAID'] },
  cancelled: { status: ['CANCELLED'] },
}

/** All clients' invoices: what is to send, to collect and overdue, with the tariff and a manual run a click away. */
export function InvoicesPage() {
  const { t } = useTranslation('billing')
  const { page, size, setPage, setSize, get, set } = useListParams({ size: 50 })
  const filter = get('filter') ?? 'all'
  const [prices, setPrices] = useState(false)
  const [generating, setGenerating] = useState(false)
  const summary = useInvoiceSummary().data
  const filters: InvoiceFilters = { ...FILTERS[filter], page, size }
  const query = useInvoices(filters)
  const data = query.data ?? emptyPage<InvoiceResponse>()

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <>
            <Button variant="outline" onClick={() => setPrices(true)}>
              <Tags />
              {t('actions.prices')}
            </Button>
            <Button onClick={() => setGenerating(true)}>
              <FilePlus2 />
              {t('actions.generate')}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label={t('summary.drafts')}
          value={String(summary?.draftCount ?? '—')}
          hint={t('summary.draftsHint')}
          onClick={() => set({ filter: 'draft' })}
        />
        <SummaryCard
          label={t('summary.unpaid')}
          value={formatEur(summary?.unpaidEur)}
          hint={summary ? t('summary.count', { count: summary.unpaidCount }) : undefined}
          onClick={() => set({ filter: 'unpaid' })}
        />
        <SummaryCard
          label={t('summary.overdue')}
          value={formatEur(summary?.overdueEur)}
          hint={summary ? t('summary.count', { count: summary.overdueCount }) : undefined}
          danger={(summary?.overdueCount ?? 0) > 0}
          onClick={() => set({ filter: 'overdue' })}
        />
      </div>

      <Tabs value={filter} onValueChange={(v) => set({ filter: v === 'all' ? undefined : String(v) })} className="mb-4">
        <TabsList className="flex-wrap">
          {Object.keys(FILTERS).map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`filters.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <InvoicesTable invoices={data.content} isLoading={query.isPending} />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>

      <PricesDialog open={prices} onOpenChange={setPrices} />
      <GenerateDialog open={generating} onOpenChange={setGenerating} />
    </>
  )
}

function SummaryCard({ label, value, hint, danger, onClick }: { label: string; value: string; hint?: string; danger?: boolean; onClick: () => void }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className={cn('cursor-pointer py-4 transition-colors hover:bg-muted/50', danger && 'border-red-300 bg-red-50 hover:bg-red-100/70 dark:border-red-900 dark:bg-red-950/30')}
    >
      <CardContent className="px-4">
        <p className={cn('text-sm text-muted-foreground', danger && 'text-red-800 dark:text-red-300')}>{label}</p>
        <p className={cn('mt-1 text-2xl font-semibold tabular-nums', danger && 'text-red-700 dark:text-red-300')}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
