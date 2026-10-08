import { ArrowRight, Bot, Hand, ScanBarcode, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import type { HistorySource, ParcelHistoryResponse } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'
import { ParcelStatusBadge } from './ParcelStatusBadge'

const ICONS: Record<HistorySource, ReactNode> = {
  SCAN: <ScanBarcode className="size-4" />,
  MANUAL: <Hand className="size-4" />,
  NOVA_POSHTA: <Truck className="size-4" />,
  SYSTEM: <Bot className="size-4" />,
}

export function ParcelHistory({ entries, isLoading }: { entries?: ParcelHistoryResponse[]; isLoading: boolean }) {
  const { t } = useTranslation(['parcels', 'common'])

  if (isLoading) return <Skeleton className="h-24 w-full" />
  if (!entries?.length) return <p className="text-sm text-muted-foreground">{t('parcels:history.empty')}</p>

  return (
    <ol className="relative ml-2 border-l pl-6">
      {entries.map((e) => (
        <li key={e.id} className="relative mb-5 last:mb-0">
          <span className="absolute -left-[31px] flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground">
            {e.source ? ICONS[e.source] : null}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{formatDateTime(e.changedAt)}</span>
            {e.seatNumber != null && (
              <span className="rounded bg-muted px-1.5 text-xs">{t('parcels:history.seat', { n: e.seatNumber })}</span>
            )}
            {e.source && <span className="text-xs text-muted-foreground">{t(`common:historySource.${e.source}`)}</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            {showsOurStatus(e) && (
              <>
                {e.previousStatus && (
                  <>
                    <ParcelStatusBadge status={e.previousStatus} />
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </>
                )}
                <ParcelStatusBadge status={e.status} />
                {e.warehouseName && <span className="text-xs text-muted-foreground">{e.warehouseName}</span>}
              </>
            )}
            {showsNpStatus(e) && (
              <span>
                {t('parcels:fields.npStatus')}: <span className="font-medium">{e.npStatusText}</span>
                {e.npStatusCode && <span className="text-muted-foreground"> ({e.npStatusCode})</span>}
              </span>
            )}
          </div>
          {(e.changedByName || e.comment) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {e.changedByName}
              {e.changedByName && e.comment && ' — '}
              {e.comment}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}

/**
 * Every entry carries the parcel's NP status as a snapshot, so a scan ("received by representative") must still show
 * OUR status change; the NP line is only the point for tracking/import entries or when nothing else changed.
 */
function showsOurStatus(e: ParcelHistoryResponse): boolean {
  if (!e.status) return false
  if (e.source !== 'NOVA_POSHTA') return true
  return !!e.previousStatus && e.previousStatus !== e.status
}

function showsNpStatus(e: ParcelHistoryResponse): boolean {
  if (!e.npStatusText) return false
  return e.source === 'NOVA_POSHTA' || e.source === 'SYSTEM' || !showsOurStatus(e)
}
