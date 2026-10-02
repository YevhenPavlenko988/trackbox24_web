import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable, type Column, type Selection } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAccess } from '@/features/auth/access'
import type { ParcelResponse } from '@/lib/api/types'
import { formatDate, formatDateTime, formatMoney, formatPhone } from '@/lib/format'
import { ParcelStatusBadge } from './ParcelStatusBadge'

export function seatsProgress(p: ParcelResponse): string {
  const total = p.seatsAmount ?? p.seats?.length ?? 1
  if (!p.seats?.length || !p.status) return String(total)
  const reached = p.seats.filter((s) => s.status === p.status).length
  return reached === total ? String(total) : `${reached} / ${total}`
}

export function isPaidStorageDue(p: ParcelResponse): boolean {
  return !!p.npPaidStorageFrom && new Date(p.npPaidStorageFrom).getTime() <= Date.now()
}

export function ParcelsTable({
  rows,
  isLoading,
  hideClient = false,
  emptyText,
  actions,
  extra,
  selection,
}: {
  rows: ParcelResponse[]
  isLoading?: boolean
  hideClient?: boolean
  emptyText?: ReactNode
  actions?: (p: ParcelResponse) => ReactNode
  /** Rendered next to the status badge (e.g. "outside the plan"). */
  extra?: (p: ParcelResponse) => ReactNode
  selection?: Selection
}) {
  const { t } = useTranslation(['parcels', 'common'])
  const navigate = useNavigate()
  const { canSeeMoney } = useAccess()

  const columns: Column<ParcelResponse>[] = [
    {
      key: 'code',
      header: t('parcels:fields.barcode'),
      cell: (p) => (
        <div className="flex flex-col">
          <span className="font-mono font-medium">{p.barcode ?? '—'}</span>
          {p.npTtn && <span className="text-xs text-muted-foreground">{t('parcels:fields.npTtnShort')} {p.npTtn}</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('parcels:fields.status'),
      cell: (p) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <ParcelStatusBadge status={p.status} />
          {p.status === 'AT_WAREHOUSE' && p.warehouseName && <span className="text-xs text-muted-foreground">{p.warehouseName}</span>}
          {extra?.(p)}
          {p.needsEnrichment && (
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <AlertCircle className="size-4 text-amber-600" />
              </TooltipTrigger>
              <TooltipContent>{t('parcels:needsEnrichment')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
    ...(hideClient
      ? []
      : [
          {
            key: 'client',
            header: t('parcels:fields.client'),
            cell: (p: ParcelResponse) => (
              <div className="flex flex-col">
                <span>{p.clientName ?? '—'}</span>
                {p.clientPhone && <span className="text-xs text-muted-foreground">{formatPhone(p.clientPhone)}</span>}
                {p.deliveryCity && <span className="text-xs text-muted-foreground">→ {p.deliveryCity}</span>}
              </div>
            ),
          },
        ]),
    {
      key: 'sender',
      header: t('parcels:fields.sender'),
      cell: (p) => (
        <div className="flex flex-col">
          <span>{p.senderName ?? '—'}</span>
          {p.senderCity && <span className="text-xs text-muted-foreground">{p.senderCity}</span>}
        </div>
      ),
    },
    { key: 'seats', header: t('parcels:fields.seats'), cell: (p) => seatsProgress(p), className: 'text-center' },
    { key: 'delivery', header: t('parcels:fields.npScheduledDeliveryAt'), cell: (p) => formatDate(p.npScheduledDeliveryAt) },
    {
      key: 'paidStorage',
      header: t('parcels:fields.npPaidStorageFrom'),
      cell: (p) =>
        isPaidStorageDue(p) ? (
          <Badge variant="destructive">{formatDate(p.npPaidStorageFrom)}</Badge>
        ) : (
          formatDate(p.npPaidStorageFrom)
        ),
    },
    ...(canSeeMoney
      ? [
          {
            key: 'payment',
            header: t('parcels:payment.title'),
            cell: (p: ParcelResponse) => (
              <div className="flex flex-col">
                <span>{formatMoney(p.deliveryPrice, p.deliveryPriceCurrency)}</span>
                {p.deliveryPrice != null && (
                  <span className={p.paymentStatus === 'PAID' ? 'text-xs text-emerald-700' : 'text-xs text-amber-700'}>
                    {t(`parcels:payment.${p.paymentStatus ?? 'UNPAID'}`)}
                  </span>
                )}
              </div>
            ),
          },
        ]
      : []),
    { key: 'createdAt', header: t('common:common.createdAt'), cell: (p) => formatDateTime(p.createdAt) },
    ...(actions
      ? [
          {
            key: 'actions',
            header: '',
            className: 'w-12 text-right',
            cell: (p: ParcelResponse) => (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                {actions(p)}
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(p) => p.id ?? 0}
      onRowClick={(p) => navigate(`/parcels/${p.id}`)}
      rowClassName={(p) => (isPaidStorageDue(p) ? 'bg-destructive/5' : undefined)}
      isLoading={isLoading}
      emptyText={emptyText}
      selection={selection}
    />
  )
}
