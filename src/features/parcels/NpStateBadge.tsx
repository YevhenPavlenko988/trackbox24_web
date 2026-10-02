import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { NpState, ParcelResponse } from '@/lib/api/types'
import { npStateOf, npStatusTextOf } from './npStatus'

const STYLES: Record<NpState, string> = {
  CREATED: 'border-slate-300 text-slate-700',
  IN_TRANSIT: 'border-sky-300 bg-sky-50 text-sky-800',
  ARRIVED: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  RECEIVED: 'border-emerald-400 bg-emerald-100 text-emerald-900',
  REDIRECTED: 'border-amber-300 bg-amber-50 text-amber-800',
  RETURNING: 'border-red-300 bg-red-50 text-red-800',
  DELIVERY_FAILED: 'border-red-300 bg-red-50 text-red-800',
  NOT_FOUND: 'border-slate-300 bg-slate-100 text-slate-600',
  OTHER: 'border-slate-300 text-slate-700',
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

/** Picked up at the branch (per Nova Poshta) but not yet scanned in by our representative. */
export function isPickedUpNotScanned(p: Pick<ParcelResponse, 'status' | 'npState' | 'npStatusCode' | 'npStatusText'>): boolean {
  return p.status === 'IN_NOVA_POSHTA' && npStateOf(p) === 'RECEIVED'
}

export function PickedUpNotScannedBadge() {
  const { t } = useTranslation('parcels')
  return (
    <Badge variant="outline" className="border-orange-400 bg-orange-50 text-orange-800">
      {t('np.pickedUpNotScanned')}
    </Badge>
  )
}
