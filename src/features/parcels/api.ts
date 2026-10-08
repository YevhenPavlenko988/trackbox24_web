import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type { components } from '@/lib/api/schema'
import type {
  Channel,
  DeletedItem,
  ParcelCreateRequest,
  ParcelHistoryResponse,
  ParcelPaymentRequest,
  ParcelResponse,
  ParcelStatus,
  ParcelStatusChangeRequest,
  ParcelUpdateRequest,
  PaymentStatus,
} from '@/lib/api/types'

export type ParcelListParams = PageParams & {
  /** Parcels in any of these statuses; empty or absent means every status. */
  status?: ParcelStatus[]
  clientId?: number
  representativeId?: number
  needsEnrichment?: boolean
  paymentStatus?: PaymentStatus
  warehouseId?: number
  deliveryCity?: string
  channel?: Channel
  query?: string
}

export async function listParcels(params: ParcelListParams): Promise<Page<ParcelResponse>> {
  const data = await unwrap(
    api.GET('/api/parcels', {
      params: {
        query: {
          status: params.status?.length ? params.status : undefined,
          clientId: params.clientId,
          representativeId: params.representativeId,
          needsEnrichment: params.needsEnrichment,
          paymentStatus: params.paymentStatus,
          warehouseId: params.warehouseId,
          deliveryCity: params.deliveryCity || undefined,
          channel: params.channel,
          query: params.query || undefined,
          page: params.page,
          size: params.size,
          sort: params.sort ? [params.sort] : undefined,
        },
      },
    }),
  )
  return normalizePage(data)
}

export function getParcel(id: number): Promise<ParcelResponse> {
  return unwrap(api.GET('/api/parcels/{id}', { params: { path: { id } } }))
}

export async function getParcelHistory(id: number): Promise<ParcelHistoryResponse[]> {
  const data = await unwrap(api.GET('/api/parcels/{id}/history', { params: { path: { id }, query: { size: 200, sort: ['changedAt', 'id'] } } }))
  return data.content ?? []
}

export function deleteParcel(id: number): Promise<unknown> {
  return unwrap(api.DELETE('/api/parcels/{id}', { params: { path: { id } } }))
}

export function restoreParcel(id: number): Promise<ParcelResponse> {
  return unwrap(api.POST('/api/parcels/{id}/restore', { params: { path: { id } } }))
}

export async function listDeletedParcels(params: PageParams): Promise<Page<DeletedItem<ParcelResponse>>> {
  const data = await unwrap(api.GET('/api/parcels/deleted', { params: { query: { page: params.page, size: params.size } } }))
  return normalizePage(data)
}

export function createParcel(body: ParcelCreateRequest): Promise<ParcelResponse> {
  return unwrap(api.POST('/api/parcels', { body }))
}

export function updateParcel(id: number, body: ParcelUpdateRequest): Promise<ParcelResponse> {
  return unwrap(api.PUT('/api/parcels/{id}', { params: { path: { id } }, body }))
}

export function changeParcelStatus(id: number, body: ParcelStatusChangeRequest): Promise<ParcelResponse> {
  return unwrap(api.POST('/api/parcels/{id}/status', { params: { path: { id } }, body }))
}

export function setParcelPayment(id: number, body: ParcelPaymentRequest): Promise<ParcelResponse> {
  return unwrap(api.PUT('/api/parcels/{id}/payment', { params: { path: { id } }, body }))
}

export function refreshParcelFromNp(id: number): Promise<ParcelResponse> {
  return unwrap(api.POST('/api/parcels/{id}/nova-poshta/refresh', { params: { path: { id } } }))
}

export type NpSyncResult = components['schemas']['SyncResult']

/** Same job the backend cron does: import incoming waybills of the company's representatives and refresh NP statuses. */
export function syncNovaPoshta(): Promise<NpSyncResult> {
  return unwrap(api.POST('/api/nova-poshta/sync'))
}
