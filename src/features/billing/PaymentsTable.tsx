import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { DataTable, type Column } from '@/components/common/DataTable'
import type { BillingPaymentResponse } from '@/lib/api/types'
import { formatDate, formatMoney, type MoneyCurrency } from '@/lib/format'
import { formatEur, formatPeriod } from './format'
import { PaymentDialog } from './PaymentDialog'

/** Payments, newest first; a row opens the payment to correct or delete it. */
export function PaymentsTable({
  payments,
  isLoading,
  showCompany = true,
  showInvoice = true,
}: {
  payments: BillingPaymentResponse[]
  isLoading?: boolean
  showCompany?: boolean
  showInvoice?: boolean
}) {
  const { t } = useTranslation('billing')
  const [selected, setSelected] = useState<BillingPaymentResponse | null>(null)
  const columns: Column<BillingPaymentResponse>[] = [
    ...(showCompany
      ? [
          {
            key: 'company',
            header: t('payment.client'),
            cell: (p: BillingPaymentResponse) => (
              <Link to={`/companies/${p.company?.id}?tab=billing`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                {p.company?.name}
              </Link>
            ),
          },
        ]
      : []),
    { key: 'paidOn', header: t('fields.paidOn'), cell: (p) => <span className="whitespace-nowrap tabular-nums">{formatDate(p.paidOn)}</span> },
    {
      key: 'amount',
      header: t('payment.credited'),
      className: 'text-right',
      cell: (p) => (
        <div className="text-right tabular-nums">
          <span className="font-medium">{formatEur(p.amountEur)}</span>
          {p.receivedAmount != null && (
            <span className="block text-xs text-muted-foreground">{formatMoney(p.receivedAmount, p.receivedCurrency as MoneyCurrency)}</span>
          )}
        </div>
      ),
    },
    { key: 'method', header: t('payment.method'), cell: (p) => p.method?.name ?? <span className="text-muted-foreground">{t('payment.unknownMethod')}</span> },
    ...(showInvoice
      ? [
          {
            key: 'invoice',
            header: t('payment.invoice'),
            cell: (p: BillingPaymentResponse) =>
              p.invoiceId ? (
                <span>
                  №{p.invoiceId} <span className="text-muted-foreground">· {formatPeriod(p.invoicePeriod)}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">{t('payment.advance')}</span>
              ),
          },
        ]
      : []),
    {
      key: 'details',
      header: t('payment.details'),
      cell: (p) => (
        <div className="max-w-64 text-sm">
          {p.reference && <span className="block tabular-nums">{p.reference}</span>}
          {p.note && <span className="block truncate text-muted-foreground">{p.note}</span>}
          {!p.reference && !p.note && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    { key: 'by', header: t('payment.by'), cell: (p) => <span className="text-sm text-muted-foreground">{p.createdBy ?? t('company.system')}</span> },
  ]
  return (
    <>
      <DataTable
        columns={columns}
        rows={payments}
        rowKey={(p) => p.id ?? 0}
        onRowClick={(p) => setSelected(p)}
        isLoading={isLoading}
        emptyText={t('payment.empty')}
      />
      {selected && <PaymentDialog payment={selected} onOpenChange={(o) => !o && setSelected(null)} />}
    </>
  )
}
