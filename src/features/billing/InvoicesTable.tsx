import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable, type Column } from '@/components/common/DataTable'
import type { InvoiceResponse } from '@/lib/api/types'
import { formatDate } from '@/lib/format'
import { formatEur, formatPeriod } from './format'
import { InvoiceDialog } from './InvoiceDialog'
import { InvoiceStatusBadge, overdueRow } from './InvoiceStatusBadge'

/** Invoices with overdue ones tinted red; a row opens the invoice with its actions. */
export function InvoicesTable({ invoices, isLoading, showCompany = true }: { invoices: InvoiceResponse[]; isLoading?: boolean; showCompany?: boolean }) {
  const { t } = useTranslation('billing')
  const [selected, setSelected] = useState<InvoiceResponse | null>(null)
  const columns: Column<InvoiceResponse>[] = [
    { key: 'id', header: t('fields.number'), cell: (i) => <span className="text-muted-foreground tabular-nums">{i.id}</span> },
    { key: 'period', header: t('fields.period'), cell: (i) => <span className="capitalize">{formatPeriod(i.period)}</span> },
    ...(showCompany ? [{ key: 'company', header: t('fields.company'), cell: (i: InvoiceResponse) => <span className="font-medium">{i.company?.name}</span> }] : []),
    { key: 'amount', header: t('fields.amount'), cell: (i) => <span className="tabular-nums">{formatEur(i.amountEur)}</span> },
    { key: 'status', header: t('fields.status'), cell: (i) => <InvoiceStatusBadge invoice={i} /> },
    { key: 'dueOn', header: t('fields.dueOn'), cell: (i) => (i.dueOn ? formatDate(i.dueOn) : '—') },
    { key: 'paidOn', header: t('fields.paidOn'), cell: (i) => (i.paidOn ? formatDate(i.paidOn) : '—') },
  ]
  return (
    <>
      <DataTable
        columns={columns}
        rows={invoices}
        rowKey={(i) => i.id ?? 0}
        onRowClick={(i) => setSelected(i)}
        rowClassName={overdueRow}
        isLoading={isLoading}
        emptyText={t('invoice.empty')}
      />
      <InvoiceDialog invoice={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  )
}
