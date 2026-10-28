import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type { CompanyRequest, CompanyResponse, NovaPoshtaKeyRequest, NpSenderRequest, SyncResult } from '@/lib/api/types'

export async function listCompanies(params: PageParams): Promise<Page<CompanyResponse>> {
  const data = await unwrap(
    api.GET('/api/companies', {
      params: { query: { page: params.page, size: params.size, sort: [params.sort ?? 'name,asc'] } },
    }),
  )
  return normalizePage(data)
}

export function getCompany(id: number): Promise<CompanyResponse> {
  return unwrap(api.GET('/api/companies/{id}', { params: { path: { id } } }))
}

export function getCurrentCompany(): Promise<CompanyResponse> {
  return unwrap(api.GET('/api/companies/current'))
}

export function createCompany(body: CompanyRequest): Promise<CompanyResponse> {
  return unwrap(api.POST('/api/companies', { body }))
}

export function updateCompany(id: number, body: CompanyRequest): Promise<CompanyResponse> {
  return unwrap(api.PUT('/api/companies/{id}', { params: { path: { id } }, body }))
}

export function setCompanyActive(id: number, value: boolean): Promise<CompanyResponse> {
  return unwrap(api.PUT('/api/companies/{id}/active', { params: { path: { id }, query: { value } } }))
}

/** Public tracking page for the company's clients; admin or sales. */
export function setCompanyPublicTracking(id: number, value: boolean): Promise<CompanyResponse> {
  return unwrap(api.PUT('/api/companies/{id}/public-tracking', { params: { path: { id }, query: { value } } }))
}

/** Platform admin switch: without it the company gets 403 on photo upload; existing photos stay viewable. */
export function setCompanyPhotos(id: number, value: boolean): Promise<CompanyResponse> {
  return unwrap(api.PUT('/api/companies/{id}/photos', { params: { path: { id }, query: { value } } }))
}

export function setCompanyNpKey(id: number, body: NovaPoshtaKeyRequest): Promise<CompanyResponse> {
  return unwrap(api.PUT('/api/companies/{id}/nova-poshta', { params: { path: { id } }, body }))
}

/** Where our outgoing Nova Poshta waybills are sent from (city, branch, contact phone of the NP account). */
export function setCompanyNpSender(id: number, body: NpSenderRequest): Promise<CompanyResponse> {
  return unwrap(api.PUT('/api/companies/{id}/nova-poshta-sender', { params: { path: { id } }, body }))
}

export function syncNovaPoshta(): Promise<SyncResult> {
  return unwrap(api.POST('/api/nova-poshta/sync'))
}
