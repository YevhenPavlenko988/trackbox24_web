import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type { ClientRequest, ClientResponse, ParcelResponse, ParcelStatus } from '@/lib/api/types'

export type ClientListParams = PageParams & { search?: string }

export async function listClients(params: ClientListParams): Promise<Page<ClientResponse>> {
  const data = await unwrap(
    api.GET('/api/clients', {
      params: {
        query: {
          search: params.search || undefined,
          page: params.page,
          size: params.size,
          sort: [params.sort ?? 'lastName,asc'],
        },
      },
    }),
  )
  return normalizePage(data)
}

export function getClient(id: number): Promise<ClientResponse> {
  return unwrap(api.GET('/api/clients/{id}', { params: { path: { id } } }))
}

export function createClient(body: ClientRequest): Promise<ClientResponse> {
  return unwrap(api.POST('/api/clients', { body }))
}

export function updateClient(id: number, body: ClientRequest): Promise<ClientResponse> {
  return unwrap(api.PUT('/api/clients/{id}', { params: { path: { id } }, body }))
}

export type ClientParcelsParams = PageParams & { status?: ParcelStatus }

export async function listClientParcels(id: number, params: ClientParcelsParams): Promise<Page<ParcelResponse>> {
  const data = await unwrap(
    api.GET('/api/clients/{id}/parcels', {
      params: {
        path: { id },
        query: { status: params.status, page: params.page, size: params.size, sort: params.sort ? [params.sort] : undefined },
      },
    }),
  )
  return normalizePage(data)
}

export function clientDisplayName(c: ClientResponse | undefined): string {
  if (!c) return '—'
  if (c.type === 'ORGANIZATION' && c.organizationName) return c.organizationName
  return [c.lastName, c.firstName, c.middleName].filter(Boolean).join(' ') || c.organizationName || '—'
}
