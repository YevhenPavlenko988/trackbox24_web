import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type {
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
  status?: ParcelStatus
  clientId?: number
  representativeId?: number
  needsEnrichment?: boolean
  paymentStatus?: PaymentStatus
  warehouseId?: number
  query?: string
}

export async function listParcels(params: ParcelListParams): Promise<Page<ParcelResponse>> {
  const data = await unwrap(
    api.GET('/api/parcels', {
      params: {
        query: {
          status: params.status,
          clientId: params.clientId,
          representativeId: params.representativeId,
          needsEnrichment: params.needsEnrichment,
          paymentStatus: params.paymentStatus,
          warehouseId: params.warehouseId,
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

export function getParcelHistory(id: number): Promise<ParcelHistoryResponse[]> {
  return unwrap(api.GET('/api/parcels/{id}/history', { params: { path: { id } } }))
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
