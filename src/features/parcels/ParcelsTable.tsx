import { AlertCircle, Route, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable, type Column, type Selection } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAccess } from '@/features/auth/access'
import type { ParcelResponse } from '@/lib/api/types'
import { formatDate, formatDateTime, formatMoney, formatPhone } from '@/lib/format'
import { NpStateBadge } from './NpStateBadge'
import { NpPaymentSummary } from './NpPaymentCard'
import { ChannelBadge } from '@/features/channels/channel'
import { isGoneFromNp, npStateOf, npStatusTextOf } from './npStatus'
import { ParcelStatusBadge } from './ParcelStatusBadge'

export function seatsProgress(p: ParcelResponse): string {
  // Parcels imported without NP tracking have no seatsAmount yet: say so instead of pretending it is 1.
  if (p.seatsAmount == null && !p.seats?.length) return '?'
  const total = p.seatsAmount ?? p.seats?.length ?? 1
  if (!p.seats?.length || !p.status) return String(total)
  const reached = p.seats.filter((s) => s.status === p.status).length
  return reached === total ? String(total) : `${reached} / ${total}`
}

/** Storage is only charged while the parcel still sits at the branch, so a collected one is never "due". */
export function isPaidStorageDue(p: ParcelResponse): boolean {
  return p.status === 'IN_NOVA_POSHTA' && !!p.npPaidStorageFrom && new Date(p.npPaidStorageFrom).getTime() <= Date.now()
}

export function ParcelsTable({
  rows,
  isLoading,
  hideClient = false,
  hideNp = false,
  hidePlan = false,
  emptyText,
  actions,
  extra,
  selection,
}: {
  rows: ParcelResponse[]
  isLoading?: boolean
  hideClient?: boolean
  /** Nova Poshta state, dates and payment: nothing to add once the parcel is in a trip. */
  hideNp?: boolean
  /** The trip badges: redundant on a trip's own page, where the section already says it. */
  hidePlan?: boolean
  emptyText?: ReactNode
  actions?: (p: ParcelResponse) => ReactNode
  /** Rendered next to the status badge (e.g. "outside the plan"). */
  extra?: (p: ParcelResponse) => ReactNode
  selection?: Selection
}) {
  const { t } = useTranslation(['parcels', 'common', 'trips'])
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
          {/* Planned for a trip but not loaded yet: otherwise it looks free to plan elsewhere. */}
          {!hidePlan && p.plannedTripId != null && p.tripId == null && (
            <Badge variant="outline" className="gap-1 font-normal">
              <Route className="size-3" />
              {t('trips:picker.inPlan', { id: p.plannedTripId })}
            </Badge>
          )}
          {/* Actually loaded: «У машині» alone does not say whose car it is in. */}
          {!hidePlan && p.tripId != null && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Truck className="size-3" />
              {t('trips:one', { id: p.tripId })}
            </Badge>
          )}
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
    {
      key: 'npState',
      header: t('parcels:fields.npState'),
      cell: (p) => {
        const state = npStateOf(p)
        const text = npStatusTextOf(p)
        return state ? (
          <div className="flex flex-col items-start gap-0.5">
            <NpStateBadge parcel={p} />
            {text && state !== 'OTHER' && (
              <span className="line-clamp-2 max-w-56 text-xs text-muted-foreground" title={text}>
                {text}
              </span>
            )}
            {p.npStatusUpdatedAt && <span className="text-xs text-muted-foreground">{formatDateTime(p.npStatusUpdatedAt)}</span>}
          </div>
        ) : p.npTtn ? (
          <span className="text-xs text-muted-foreground">{t('parcels:np.noTracking')}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    ...(hideClient
      ? []
      : [
          {
            key: 'client',
            header: t('parcels:fields.client'),
            cell: (p: ParcelResponse) => (
              <div className="flex flex-col">
                <span className="inline-flex items-center gap-1.5">
                  {p.channel && <ChannelBadge channel={p.channel} compact />}
                  {p.clientName ?? '—'}
                </span>
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
          {p.senderPhone && <span className="text-xs text-muted-foreground">{formatPhone(p.senderPhone)}</span>}
          {p.senderCity && <span className="text-xs text-muted-foreground">{p.senderCity}</span>}
        </div>
      ),
    },
    {
      key: 'seats',
      header: t('parcels:fields.seats'),
      cell: (p) => {
        const v = seatsProgress(p)
        return v === '?' ? <span title={t('parcels:np.seatsUnknownShort')}>?</span> : v
      },
      className: 'text-center',
    },
    {
      key: 'npDates',
      header: t('parcels:fields.npDates'),
      cell: (p) =>
        p.npScheduledDeliveryAt || p.npPaidStorageFrom ? (
          <div className="flex flex-col">
            {p.npScheduledDeliveryAt && <span>{formatDate(p.npScheduledDeliveryAt)}</span>}
            {p.npPaidStorageFrom && (
              <span className={isPaidStorageDue(p) ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>
                {t('parcels:fields.npPaidStorageShort', { date: formatDate(p.npPaidStorageFrom) })}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'npPayment', header: t('parcels:np.columnTitle'), cell: (p) => <NpPaymentSummary parcel={p} /> },
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
                    {p.paymentMethod && ` · ${t(`common:paymentMethod.${p.paymentMethod}`)}`}
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

  const visible = hideNp ? columns.filter((c) => !['npState', 'npDates', 'npPayment'].includes(c.key)) : columns

  return (
    <DataTable
      columns={visible}
      rows={rows}
      rowKey={(p) => p.id ?? 0}
      onRowClick={(p) => navigate(`/parcels/${p.id}`)}
      rowClassName={(p) =>
        isPaidStorageDue(p) ? 'bg-destructive/5' : p.status === 'IN_NOVA_POSHTA' && p.npTtn && isGoneFromNp(p) ? 'opacity-60' : undefined
      }
      isLoading={isLoading}
      emptyText={emptyText}
      selection={selection}
    />
  )
}
