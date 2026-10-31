import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type { ParcelResponse, RouteRequest, RouteResponse, TripRequest } from '@/lib/api/types'

export async function listRoutes(params: PageParams): Promise<Page<RouteResponse>> {
  return normalizePage(await unwrap(api.GET('/api/routes', { params: { query: { page: params.page, size: params.size } } })))
}

export function getRoute(id: number): Promise<RouteResponse> {
  return unwrap(api.GET('/api/routes/{id}', { params: { path: { id } } }))
}

export async function getRouteParcels(id: number): Promise<ParcelResponse[]> {
  return normalizePage(await unwrap(api.GET('/api/routes/{id}/parcels', { params: { path: { id }, query: { size: 200 } } }))).content
}

export function createRoute(body: RouteRequest): Promise<RouteResponse> {
  return unwrap(api.POST('/api/routes', { body }))
}

export function addRouteLeg(id: number, body: TripRequest): Promise<RouteResponse> {
  return unwrap(api.POST('/api/routes/{id}/legs', { params: { path: { id } }, body }))
}

export function planRouteParcels(id: number, parcelIds: number[]): Promise<RouteResponse> {
  return unwrap(api.POST('/api/routes/{id}/parcels', { params: { path: { id } }, body: { parcelIds } }))
}

export function unplanRouteParcel(id: number, parcelId: number): Promise<RouteResponse> {
  return unwrap(api.DELETE('/api/routes/{id}/parcels/{parcelId}', { params: { path: { id, parcelId } } }))
}
