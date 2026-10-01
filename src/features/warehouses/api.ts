import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type { ParcelResponse, WarehouseRequest, WarehouseResponse } from '@/lib/api/types'

export type WarehouseListParams = PageParams & { active?: boolean }

export async function listWarehouses(params: WarehouseListParams): Promise<Page<WarehouseResponse>> {
  const data = await unwrap(
    api.GET('/api/warehouses', {
      params: { query: { active: params.active, page: params.page, size: params.size, sort: [params.sort ?? 'name,asc'] } },
    }),
  )
  return normalizePage(data)
}

export function createWarehouse(body: WarehouseRequest): Promise<WarehouseResponse> {
  return unwrap(api.POST('/api/warehouses', { body }))
}

export function updateWarehouse(id: number, body: WarehouseRequest): Promise<WarehouseResponse> {
  return unwrap(api.PUT('/api/warehouses/{id}', { params: { path: { id } }, body }))
}

/** Moves every seat of each parcel to the warehouse; the backend applies all-or-nothing. */
export function moveParcelsToWarehouse(id: number, parcelIds: number[], comment?: string): Promise<ParcelResponse[]> {
  return unwrap(api.POST('/api/warehouses/{id}/parcels', { params: { path: { id } }, body: { parcelIds, comment } }))
}
