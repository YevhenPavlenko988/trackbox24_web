import { ArrowRight, CalendarPlus, ListMinus, ListPlus, PackageCheck, PackageMinus, PackagePlus, Pencil, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import type { TripEvent, TripHistoryResponse } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'
import { TripStatusBadge } from './TripStatusBadge'

const ICONS: Record<TripEvent, ReactNode> = {
  CREATED: <CalendarPlus className="size-4" />,
  UPDATED: <Pencil className="size-4" />,
  STATUS_CHANGED: <RefreshCw className="size-4" />,
  PARCEL_PLANNED: <ListPlus className="size-4" />,
  PARCEL_UNPLANNED: <ListMinus className="size-4" />,
  PARCEL_LOADED: <PackagePlus className="size-4" />,
  PARCEL_DELIVERED: <PackageCheck className="size-4" />,
  PARCEL_UNLOADED: <PackageMinus className="size-4" />,
  DELETED: <Trash2 className="size-4" />,
  RESTORED: <RotateCcw className="size-4" />,
}

export function TripHistory({ entries, isLoading }: { entries?: TripHistoryResponse[]; isLoading: boolean }) {
  const { t } = useTranslation('trips')

  if (isLoading) return <Skeleton className="h-24 w-full" />
  if (!entries?.length) return <p className="text-sm text-muted-foreground">{t('history.empty')}</p>

  return (
    <ol className="relative ml-2 border-l pl-6">
      {[...entries].reverse().map((e) => (
        <li key={e.id} className="relative mb-5 last:mb-0">
          <span className="absolute -left-[31px] flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground">
            {e.event ? ICONS[e.event] : null}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{formatDateTime(e.changedAt)}</span>
            <span className="font-medium">{e.event ? t(`history.${e.event}`) : ''}</span>
            {e.parcelBarcode && e.parcelId != null && (
              <Link to={`/parcels/${e.parcelId}`} className="font-mono underline underline-offset-4">
                {e.parcelBarcode}
              </Link>
            )}
          </div>
          {e.event === 'STATUS_CHANGED' && (
            <div className="mt-1 flex items-center gap-2 text-sm">
              {e.previousStatus && (
                <>
                  <TripStatusBadge status={e.previousStatus} />
                  <ArrowRight className="size-4 text-muted-foreground" />
                </>
              )}
              <TripStatusBadge status={e.status} />
            </div>
          )}
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
