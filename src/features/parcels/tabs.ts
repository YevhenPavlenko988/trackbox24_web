import type { ParcelStatus } from '@/lib/api/types'

export const PARCEL_TABS = ['np', 'company', 'archive'] as const
export type ParcelTab = (typeof PARCEL_TABS)[number]

export function isParcelTab(v: string | undefined): v is ParcelTab {
  return !!v && (PARCEL_TABS as readonly string[]).includes(v)
}

/** Statuses the backend is asked for; it filters by any of them in one paged request. */
export const TAB_STATUSES: Record<ParcelTab, ParcelStatus[]> = {
  np: ['IN_NOVA_POSHTA'],
  company: ['PICKED_UP_FROM_NOVA_POSHTA', 'RECEIVED_BY_REPRESENTATIVE', 'AT_WAREHOUSE', 'IN_CAR'],
  archive: ['DELIVERED_TO_CLIENT', 'CANCELLED'],
}

/** Statuses a parcel of this tab can have, for the status filter inside the tab. */
export const TAB_FILTER_STATUSES: Record<ParcelTab, ParcelStatus[]> = {
  np: ['IN_NOVA_POSHTA'],
  company: ['PICKED_UP_FROM_NOVA_POSHTA', 'RECEIVED_BY_REPRESENTATIVE', 'AT_WAREHOUSE', 'IN_CAR'],
  archive: ['DELIVERED_TO_CLIENT', 'CANCELLED'],
}


/** Which tab an old `?status=` link belongs to, so such links keep working. */
export function tabForStatus(status: ParcelStatus | undefined): ParcelTab | undefined {
  if (!status) return undefined
  return PARCEL_TABS.find((tab) => TAB_FILTER_STATUSES[tab].includes(status))
}

