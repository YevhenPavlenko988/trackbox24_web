import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { NpState, ParcelResponse } from '@/lib/api/types'
import { npStateOf, npStatusTextOf } from './npStatus'

const STYLES: Record<NpState, string> = {
  CREATED: 'border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300',
  IN_TRANSIT: 'border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300',
  ARRIVED: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
  RECEIVED: 'border-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300',
  REDIRECTED: 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
  RETURNING: 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300',
  DELIVERY_FAILED: 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300',
  NOT_FOUND: 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 text-slate-600 dark:text-slate-300',
  OTHER: 'border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300',
}

/** Our `status` says where the parcel is in our flow; `npState` is what Nova Poshta says. Both are shown side by side. */
export function NpStateBadge({ parcel }: { parcel: Pick<ParcelResponse, 'npState' | 'npStatusCode' | 'npStatusText'> }) {
  const { t } = useTranslation('parcels')
  const state = npStateOf(parcel)
  if (!state) return null
  const text = npStatusTextOf(parcel)
  const label = state === 'OTHER' ? (text ?? t('npState.OTHER')) : t(`npState.${state}`)
  const badge = (
    <Badge variant="outline" className={`gap-1 ${STYLES[state]}`}>
      <span className="text-[10px] uppercase opacity-70">НП</span>
      {label}
    </Badge>
  )
  if (!text || state === 'OTHER') return badge
  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>{badge}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}

