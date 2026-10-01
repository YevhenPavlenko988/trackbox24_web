import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type {
  ActualShipmentCompleteRequest,
  ActualShipmentResponse,
  ActualShipmentStartRequest,
  ParcelResponse,
  PlannedShipmentRequest,
  PlannedShipmentResponse,
} from '@/lib/api/types'

const pageQuery = (params: PageParams, defaultSort: string) => ({
  page: params.page,
  size: params.size,
  sort: [params.sort ?? defaultSort],
})

// ----- planned shipments -----

export async function listPlanned(params: PageParams): Promise<Page<PlannedShipmentResponse>> {
  const data = await unwrap(api.GET('/api/planned-shipments', { params: { query: pageQuery(params, 'plannedDepartureAt,desc') } }))
  return normalizePage(data)
}

export function getPlanned(id: number): Promise<PlannedShipmentResponse> {
  return unwrap(api.GET('/api/planned-shipments/{id}', { params: { path: { id } } }))
}

export function createPlanned(body: PlannedShipmentRequest): Promise<PlannedShipmentResponse> {
  return unwrap(api.POST('/api/planned-shipments', { body }))
}

export function updatePlanned(id: number, body: PlannedShipmentRequest): Promise<PlannedShipmentResponse> {
  return unwrap(api.PUT('/api/planned-shipments/{id}', { params: { path: { id } }, body }))
}

export function confirmPlanned(id: number): Promise<PlannedShipmentResponse> {
  return unwrap(api.POST('/api/planned-shipments/{id}/confirm', { params: { path: { id } } }))
}

export function cancelPlanned(id: number): Promise<PlannedShipmentResponse> {
  return unwrap(api.POST('/api/planned-shipments/{id}/cancel', { params: { path: { id } } }))
}

export function getPlannedParcels(id: number): Promise<ParcelResponse[]> {
  return unwrap(api.GET('/api/planned-shipments/{id}/parcels', { params: { path: { id } } }))
}

export function addPlannedParcels(id: number, parcelIds: number[]): Promise<ParcelResponse[]> {
  return unwrap(api.POST('/api/planned-shipments/{id}/parcels', { params: { path: { id } }, body: { parcelIds } }))
}

export function removePlannedParcel(id: number, parcelId: number): Promise<unknown> {
  return unwrap(api.DELETE('/api/planned-shipments/{id}/parcels/{parcelId}', { params: { path: { id, parcelId } } }))
}

// ----- actual shipments -----

export async function listActual(params: PageParams): Promise<Page<ActualShipmentResponse>> {
  const data = await unwrap(api.GET('/api/actual-shipments', { params: { query: pageQuery(params, 'departedAt,desc') } }))
  return normalizePage(data)
}

export function getActual(id: number): Promise<ActualShipmentResponse> {
  return unwrap(api.GET('/api/actual-shipments/{id}', { params: { path: { id } } }))
}

export function startActual(body: ActualShipmentStartRequest): Promise<ActualShipmentResponse> {
  return unwrap(api.POST('/api/actual-shipments', { body }))
}

export function completeActual(id: number, body: ActualShipmentCompleteRequest): Promise<ActualShipmentResponse> {
  return unwrap(api.POST('/api/actual-shipments/{id}/complete', { params: { path: { id } }, body }))
}

export function cancelActual(id: number): Promise<ActualShipmentResponse> {
  return unwrap(api.POST('/api/actual-shipments/{id}/cancel', { params: { path: { id } } }))
}

export function getActualParcels(id: number): Promise<ParcelResponse[]> {
  return unwrap(api.GET('/api/actual-shipments/{id}/parcels', { params: { path: { id } } }))
}
