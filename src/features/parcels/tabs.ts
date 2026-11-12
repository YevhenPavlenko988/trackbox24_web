import type { ParcelStatus } from '@/lib/api/types'

/**
 * «Усі» comes first and is where the list opens; then the two ways parcels travel (still on their way: from Ukraine
 * to us, from us to Ukraine), Nova Poshta and the archive.
 */
export const PARCEL_TABS = ['company', 'inbound', 'outbound', 'np', 'archive'] as const
export const DEFAULT_PARCEL_TAB: ParcelTab = 'company'
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
/** Still on its way: everything but delivered and cancelled. */
const ON_THE_WAY: ParcelStatus[] = [
  'IN_NOVA_POSHTA',
  'PICKED_UP_FROM_NOVA_POSHTA',
  'RECEIVED_BY_REPRESENTATIVE',
  'ACCEPTED_BY_DRIVER',
  'AT_WAREHOUSE',
  'IN_CAR',
  'SENT_VIA_NOVA_POSHTA',
]

/** The way a tab's parcels travel (the backend tells from their history and our Nova Poshta waybill); none — both. */
export const TAB_DIRECTION: Partial<Record<ParcelTab, 'INBOUND' | 'OUTBOUND'>> = { inbound: 'INBOUND', outbound: 'OUTBOUND' }

export const TAB_STATUSES: Record<ParcelTab, ParcelStatus[]> = {
  inbound: ON_THE_WAY,
  outbound: ON_THE_WAY,
  np: ['IN_NOVA_POSHTA'],
  company: [],
  archive: ['DELIVERED_TO_CLIENT', 'CANCELLED'],
}

/** Statuses a parcel of this tab can have, for the status filter inside the tab. */
export const TAB_FILTER_STATUSES: Record<ParcelTab, ParcelStatus[]> = {
  inbound: ['IN_NOVA_POSHTA', 'PICKED_UP_FROM_NOVA_POSHTA', 'RECEIVED_BY_REPRESENTATIVE', 'AT_WAREHOUSE', 'IN_CAR'],
  outbound: ['ACCEPTED_BY_DRIVER', 'AT_WAREHOUSE', 'IN_CAR', 'SENT_VIA_NOVA_POSHTA'],
  np: ['IN_NOVA_POSHTA'],
  company: [
    'IN_NOVA_POSHTA',
    'PICKED_UP_FROM_NOVA_POSHTA',
    'RECEIVED_BY_REPRESENTATIVE',
    'ACCEPTED_BY_DRIVER',
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

