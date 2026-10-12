import type { ParcelStatus } from '@/lib/api/types'

export const PARCEL_TABS = ['np', 'company', 'archive'] as const
export type ParcelTab = (typeof PARCEL_TABS)[number]

export function isParcelTab(v: string | undefined): v is ParcelTab {
  return !!v && (PARCEL_TABS as readonly string[]).includes(v)
}

/**
 * Statuses the backend is asked for; it filters by any of them in one paged request.
 *
 * The `company` tab is every parcel of the company: it asks for no status at all (the backend then returns all
 * of them) instead of spelling the statuses out in the URL. The other two tabs are the slices people look at
 * separately: what is still at Nova Poshta, and what is finished.
 */
export const TAB_STATUSES: Record<ParcelTab, ParcelStatus[]> = {
  np: ['IN_NOVA_POSHTA'],
  company: [],
  archive: ['DELIVERED_TO_CLIENT', 'CANCELLED'],
}

/** Statuses a parcel of this tab can have, for the status filter inside the tab. */
export const TAB_FILTER_STATUSES: Record<ParcelTab, ParcelStatus[]> = {
  np: ['IN_NOVA_POSHTA'],
  company: [
    'IN_NOVA_POSHTA',
    'PICKED_UP_FROM_NOVA_POSHTA',
    'RECEIVED_BY_REPRESENTATIVE',
    'AT_WAREHOUSE',
    'IN_CAR',
    'SENT_VIA_NOVA_POSHTA',
    'DELIVERED_TO_CLIENT',
    'CANCELLED',
  ],
  archive: ['DELIVERED_TO_CLIENT', 'CANCELLED'],
}

/** Which tab an old `?status=` link belongs to, so such links keep working: the narrow tabs first, `company` holds everything. */
export function tabForStatus(status: ParcelStatus | undefined): ParcelTab | undefined {
  if (!status) return undefined
  return (['np', 'archive', 'company'] as const).find((tab) => TAB_FILTER_STATUSES[tab].includes(status))
}

