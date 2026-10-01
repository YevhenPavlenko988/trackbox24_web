import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type {
  ParcelResponse,
  TripCompleteRequest,
  TripDepartRequest,
  TripHistoryResponse,
  TripRequest,
  TripResponse,
  TripStatus,
} from '@/lib/api/types'

export type TripListParams = PageParams & { status?: TripStatus }

export async function listTrips(params: TripListParams): Promise<Page<TripResponse>> {
  const data = await unwrap(
    api.GET('/api/trips', {
      params: { query: { status: params.status, page: params.page, size: params.size, sort: [params.sort ?? 'plannedDepartureAt,desc'] } },
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

export function planTripParcels(id: number, parcelIds: number[]): Promise<ParcelResponse[]> {
  return unwrap(api.POST('/api/trips/{id}/parcels', { params: { path: { id } }, body: { parcelIds } }))
}

export function unplanTripParcel(id: number, parcelId: number): Promise<unknown> {
  return unwrap(api.DELETE('/api/trips/{id}/parcels/{parcelId}', { params: { path: { id, parcelId } } }))
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

export function getTripParcels(id: number): Promise<ParcelResponse[]> {
  return unwrap(api.GET('/api/trips/{id}/parcels', { params: { path: { id } } }))
}

export function getTripHistory(id: number): Promise<TripHistoryResponse[]> {
  return unwrap(api.GET('/api/trips/{id}/history', { params: { path: { id } } }))
}
