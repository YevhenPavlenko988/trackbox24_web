import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type {
  DeletedItem,
  ParcelResponse,
  TripCompleteRequest,
  TripDepartRequest,
  TripHistoryResponse,
  TripRequest,
  TripResponse,
  TripStatus,
} from '@/lib/api/types'

/** `status` may hold several values; `open` = PLANNED + PREPARING + IN_PROGRESS. */
export type TripListParams = PageParams & { status?: TripStatus[]; open?: boolean }

/** Trip sub-lists are paged on the backend; a trip never has this many parcels or events. */
const SUBLIST_SIZE = 200

export async function listTrips(params: TripListParams): Promise<Page<TripResponse>> {
  const data = await unwrap(
    api.GET('/api/trips', {
      params: {
        query: {
          status: params.status?.length ? params.status : undefined,
          open: params.open || undefined,
          page: params.page,
          size: params.size,
          sort: [params.sort ?? 'plannedDepartureAt,desc'],
        },
      },
    }),
  )
  return normalizePage(data)
}

export function getTrip(id: number): Promise<TripResponse> {
  return unwrap(api.GET('/api/trips/{id}', { params: { path: { id } } }))
}

export function createTrip(body: TripRequest): Promise<TripResponse> {
  return unwrap(api.POST('/api/trips', { body }))
}

export function updateTrip(id: number, body: TripRequest): Promise<TripResponse> {
  return unwrap(api.PUT('/api/trips/{id}', { params: { path: { id } }, body }))
}

/** Returns the trip with refreshed counters. */
export function planTripParcels(id: number, parcelIds: number[]): Promise<TripResponse> {
  return unwrap(api.POST('/api/trips/{id}/parcels', { params: { path: { id } }, body: { parcelIds } }))
}

export function unplanTripParcel(id: number, parcelId: number): Promise<unknown> {
  return unwrap(api.DELETE('/api/trips/{id}/parcels/{parcelId}', { params: { path: { id, parcelId } } }))
}

/** PLANNED -> PREPARING without a scan; the first loading scan does the same on its own. */
export function startLoadingTrip(id: number): Promise<TripResponse> {
  return unwrap(api.POST('/api/trips/{id}/start-loading', { params: { path: { id } } }))
}

export function departTrip(id: number, body: TripDepartRequest): Promise<TripResponse> {
  return unwrap(api.POST('/api/trips/{id}/depart', { params: { path: { id } }, body }))
}

export function completeTrip(id: number, body: TripCompleteRequest): Promise<TripResponse> {
  return unwrap(api.POST('/api/trips/{id}/complete', { params: { path: { id } }, body }))
}

export function cancelTrip(id: number, warehouseId?: number): Promise<TripResponse> {
  return unwrap(api.POST('/api/trips/{id}/cancel', { params: { path: { id }, query: { warehouseId } } }))
}

export async function getTripParcels(id: number): Promise<ParcelResponse[]> {
  const data = await unwrap(api.GET('/api/trips/{id}/parcels', { params: { path: { id }, query: { size: SUBLIST_SIZE, sort: ['id'] } } }))
  return data.content ?? []
}

export async function getTripHistory(id: number): Promise<TripHistoryResponse[]> {
  const data = await unwrap(
    api.GET('/api/trips/{id}/history', { params: { path: { id }, query: { size: SUBLIST_SIZE, sort: ['changedAt', 'id'] } } }),
  )
  return data.content ?? []
}

export function deleteTrip(id: number): Promise<unknown> {
  return unwrap(api.DELETE('/api/trips/{id}', { params: { path: { id } } }))
}

export function restoreTrip(id: number): Promise<TripResponse> {
  return unwrap(api.POST('/api/trips/{id}/restore', { params: { path: { id } } }))
}

export async function listDeletedTrips(params: PageParams): Promise<Page<DeletedItem<TripResponse>>> {
  const data = await unwrap(api.GET('/api/trips/deleted', { params: { query: { page: params.page, size: params.size } } }))
  return normalizePage(data)
}

/** Downloads the XLSX register through the authenticated client (the browser cannot send the Bearer header itself). */
export async function downloadTripRegister(id: number): Promise<void> {
  const blob = await unwrap(api.GET('/api/trips/{id}/register.xlsx', { params: { path: { id } }, parseAs: 'blob' }))
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trip-${id}-register.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
