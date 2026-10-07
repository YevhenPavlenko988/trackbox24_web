import type { ParcelResponse, ParcelStatus } from '@/lib/api/types'

export const PARCEL_TABS = ['np', 'company', 'archive'] as const
export type ParcelTab = (typeof PARCEL_TABS)[number]

export function isParcelTab(v: string | undefined): v is ParcelTab {
  return !!v && (PARCEL_TABS as readonly string[]).includes(v)
}

/**
 * Statuses the backend has to be asked for. It accepts one status per request, so a tab usually needs several
 * requests that are merged on the client. A repeatable `status` param would let this be one paged request.
 */
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

/** The backend moves a parcel to PICKED_UP_FROM_NOVA_POSHTA as soon as Nova Poshta reports it as collected. */
export function inParcelTab(p: ParcelResponse, tab: ParcelTab): boolean {
  return !!p.status && TAB_STATUSES[tab].includes(p.status)
}

/** Which tab an old `?status=` link belongs to, so such links keep working. */
export function tabForStatus(status: ParcelStatus | undefined): ParcelTab | undefined {
  if (!status) return undefined
  return PARCEL_TABS.find((tab) => TAB_FILTER_STATUSES[tab].includes(status))
}

/** Sorts the merged list the way the backend would: "field,asc|desc", nulls last. */
export function compareBySort(a: ParcelResponse, b: ParcelResponse, sort?: string): number {
  const [field, dir = 'asc'] = (sort ?? 'createdAt,desc').split(',')
  const av = (a as Record<string, unknown>)[field]
  const bv = (b as Record<string, unknown>)[field]
  if (av == null && bv == null) return 0
  if (av == null) return 1
  if (bv == null) return -1
  const r = av < bv ? -1 : av > bv ? 1 : 0
  return dir === 'desc' ? -r : r
}
