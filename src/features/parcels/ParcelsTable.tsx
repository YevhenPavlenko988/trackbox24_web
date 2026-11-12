import { AlertCircle, Route, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable, type Column, type Selection } from '@/components/common/DataTable'
import { legNo } from '@/features/trips/status'
import { NpNumber } from '@/components/common/NpNumber'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAccess } from '@/features/auth/access'
import type { ParcelResponse } from '@/lib/api/types'
import { formatDate, formatDateTime, formatMoney, formatPhone, formatTime } from '@/lib/format'
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
  alwaysNp = false,
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
  /** The Nova Poshta column even when no row on the page has a waybill yet (the tabs about the way parcels travel). */
  alwaysNp?: boolean
  /** The trip badges: redundant on a trip's own page, where the section already says it. */
  hidePlan?: boolean
  emptyText?: ReactNode
  actions?: (p: ParcelResponse) => ReactNode
  /** Rendered next to the status badge (e.g. "outside the plan"). */
  extra?: (p: ParcelResponse) => ReactNode
  selection?: Selection
}) {
  const { t } = useTranslation(['parcels', 'common', 'trips', 'novaPoshta'])
  const navigate = useNavigate()
  const { canSeeMoney } = useAccess()

  // Nova Poshta's column only where there is something of it (the archive or a trip of our own parcels has none)
  const showNp = !hideNp && (alwaysNp || rows.some((p) => p.npTtn || p.npShipment?.waybillNumber))

  const columns: Column<ParcelResponse>[] = [
    {
      key: 'code',
      header: t('parcels:list.parcel'),
      cell: (p) => {
        const seats = seatsProgress(p)
        return (
          // the «needs details» mark sits at the cell's right edge, so it stays in one column whatever the code's length
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              {/* our barcode when there is one, else the waybill: never a lone «—» */}
              <span className="font-mono font-medium">{p.barcode ?? (p.npTtn ? <NpNumber value={p.npTtn} /> : `#${p.id}`)}</span>
              {p.barcode && p.npTtn && (
                <span className="text-xs text-muted-foreground">
                  {t('parcels:fields.npTtnShort')} <NpNumber value={p.npTtn} />
                </span>
              )}
              {/* Our own outgoing waybill (return parcels); a search by this number finds the parcel. */}
              {p.npShipment?.waybillNumber && (
                <span className="text-xs text-muted-foreground">
                  {t('novaPoshta:shipment.waybillShort')} <NpNumber value={p.npShipment.waybillNumber} />
                </span>
              )}
              {seats !== '1' && (
                <span className="text-xs text-muted-foreground" title={seats === '?' ? t('parcels:np.seatsUnknownShort') : undefined}>
                  {t('parcels:list.seats', { seats })}
                </span>
              )}
            </div>
            <span className="flex w-4 shrink-0 justify-center pt-0.5">
              {p.needsEnrichment && (
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <AlertCircle className="size-4 text-amber-600 dark:text-amber-300" />
                  </TooltipTrigger>
                  <TooltipContent>{t('parcels:needsEnrichment')}</TooltipContent>
                </Tooltip>
              )}
            </span>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: t('parcels:fields.status'),
      cell: (p) => {
        return (
          <div className="flex flex-col items-start gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <ParcelStatusBadge status={p.status} />
              {/* Planned for a trip but not loaded yet: otherwise it looks free to plan elsewhere. */}
              {!hidePlan && p.plannedTripId != null && p.tripId == null && (
                <Badge variant="outline" className="gap-1 font-normal">
                  <Route className="size-3" />
                  {t('trips:picker.inPlan', { number: legNo(p.plannedTripNumber ?? p.plannedTripId, p.tripLegNumber) })}
                </Badge>
              )}
              {/* Actually loaded: «У машині» alone does not say whose car it is in. */}
              {!hidePlan && p.tripId != null && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  <Truck className="size-3" />
                  {t('trips:one', { number: legNo(p.tripNumber ?? p.tripId, p.tripLegNumber) })}
                </Badge>
              )}
              {extra?.(p)}
            </div>
            {p.status === 'AT_WAREHOUSE' && p.warehouseName && <span className="text-xs text-muted-foreground">{p.warehouseName}</span>}
          </div>
        )
      },
    },
    ...(showNp
      ? [
          {
            key: 'npState',
            header: t('parcels:fields.npState'),
            className: 'min-w-36 max-w-48 whitespace-normal',
            cell: (p: ParcelResponse) => {
              // The incoming waybill if there is one, otherwise our own outgoing one (return parcels).
              const source = npStateOf(p) ? p : p.npShipment && npStateOf(p.npShipment) ? p.npShipment : undefined
              if (!source) {
                if (p.npTtn) return <span className="text-xs text-muted-foreground">{t('parcels:np.noTracking')}</span>
                // our shipment is filled in, the waybill not made yet
                if (p.npShipment && !p.npShipment.waybillNumber) return <span className="text-xs text-muted-foreground">{t('parcels:np.noWaybillYet')}</span>
                return <span className="text-muted-foreground">—</span>
              }
              const text = npStatusTextOf(source)
              return (
                <div className="flex flex-col items-start gap-0.5">
                  <NpStateBadge parcel={source} />
                  {text && npStateOf(source) !== 'OTHER' && (
                    // Nova Poshta's own words; the full text and when it was updated are in the hint
                    <span
                      className="line-clamp-2 text-xs text-muted-foreground"
                      title={[text, source.npStatusUpdatedAt ? formatDateTime(source.npStatusUpdatedAt) : undefined].filter(Boolean).join(' · ')}
                    >
                      {text}
                    </span>
                  )}
                </div>
              )
            },
          },
        ]
      : []),
    ...(hideClient
      ? []
      : [
          {
            key: 'client',
            header: t('parcels:fields.client'),
            className: 'min-w-32 max-w-44 whitespace-normal',
            cell: (p: ParcelResponse) =>
              p.clientName || p.deliveryCity ? (
                <div className="flex flex-col">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    {p.channel && <ChannelBadge channel={p.channel} compact />}
                    {p.clientName ?? <span className="text-muted-foreground">{t('parcels:list.noClient')}</span>}
                  </span>
                  {p.clientPhone && <span className="text-xs whitespace-nowrap text-muted-foreground">{formatPhone(p.clientPhone)}</span>}
                  {p.deliveryCity && <span className="text-xs text-muted-foreground">→ {p.deliveryCity}</span>}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{t('parcels:list.noClient')}</span>
              ),
          },
        ]),
    {
      key: 'sender',
      header: t('parcels:fields.sender'),
      className: 'min-w-28 max-w-44 whitespace-normal',
      cell: (p) =>
        p.senderName || p.senderPhone || p.senderCity ? (
          <div className="flex flex-col">
            {p.senderName && <span className="whitespace-nowrap">{p.senderName}</span>}
            {p.senderPhone && <span className="text-xs whitespace-nowrap text-muted-foreground">{formatPhone(p.senderPhone)}</span>}
            {p.senderCity && <span className="text-xs text-muted-foreground">{p.senderCity}</span>}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    ...(showNp
      ? [
          {
            key: 'np',
            header: t('parcels:sections.novaPoshta'),
            className: 'min-w-36 max-w-48 whitespace-normal',
            cell: (p: ParcelResponse) => {
              const dates = p.npScheduledDeliveryAt || p.npPaidStorageFrom || p.npShipment?.estimatedDeliveryDate
              if (!dates && !p.npTtn && !p.npShipment?.waybillNumber) return <span className="text-muted-foreground">—</span>
              return (
                <div className="flex flex-col gap-0.5">
                  {p.npScheduledDeliveryAt && <span className="text-xs text-muted-foreground">{t('parcels:list.npDelivery', { date: formatDate(p.npScheduledDeliveryAt) })}</span>}
                  {p.npPaidStorageFrom && (
                    <span className={isPaidStorageDue(p) ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>
                      {t('parcels:fields.npPaidStorageShort', { date: formatDate(p.npPaidStorageFrom) })}
                    </span>
                  )}
                  {/* Our own outgoing waybill (return parcels): when Nova Poshta expects to deliver it. */}
                  {p.npShipment?.estimatedDeliveryDate && (
                    <span className="text-xs text-muted-foreground">{t('parcels:np.outgoingEta', { date: formatDate(p.npShipment.estimatedDeliveryDate) })}</span>
                  )}
                  <NpPaymentSummary parcel={p} />
                </div>
              )
            },
          },
        ]
      : []),
    ...(canSeeMoney
      ? [
          {
            key: 'payment',
            header: t('parcels:payment.title'),
            className: 'min-w-28 max-w-40 whitespace-normal',
            cell: (p: ParcelResponse) => (
              <div className="flex flex-col">
                <span>{formatMoney(p.deliveryPrice, p.deliveryPriceCurrency)}</span>
                {p.deliveryPrice != null && (
                  <span className={p.paymentStatus === 'PAID' ? 'text-xs text-emerald-700 dark:text-emerald-300' : 'text-xs text-amber-700 dark:text-amber-300'}>
                    {t(`parcels:payment.${p.paymentStatus ?? 'UNPAID'}`)}
                    {p.paymentMethod && ` · ${t(`common:paymentMethod.${p.paymentMethod}`)}`}
                  </span>
                )}
                {p.paymentClaimedAt && p.paymentStatus !== 'PAID' && (
                  <span className="mt-0.5 w-fit rounded bg-amber-100 dark:bg-amber-950/40 px-1.5 text-xs font-medium text-amber-900 dark:text-amber-300">{t('parcels:online.claimedBadge')}</span>
                )}
              </div>
            ),
          },
        ]
      : []),
    {
      key: 'createdAt',
      header: t('common:common.createdAt'),
      cell: (p) => (
        <span className="whitespace-nowrap" title={formatTime(p.createdAt)}>
          {formatDate(p.createdAt)}
        </span>
      ),
    },
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
      rowClassName={(p) =>
        isPaidStorageDue(p) ? 'bg-destructive/5' : p.status === 'IN_NOVA_POSHTA' && p.npTtn && isGoneFromNp(p) ? 'opacity-60' : undefined
      }
      isLoading={isLoading}
      emptyText={emptyText}
      selection={selection}
    />
  )
}
