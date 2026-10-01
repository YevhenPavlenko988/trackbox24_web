import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type { CompanyRequest, CompanyResponse, NovaPoshtaKeyRequest, SyncResult } from '@/lib/api/types'

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

export function createCompany(body: CompanyRequest): Promise<CompanyResponse> {
  return unwrap(api.POST('/api/companies', { body }))
}

export function updateCompany(id: number, body: CompanyRequest): Promise<CompanyResponse> {
  return unwrap(api.PUT('/api/companies/{id}', { params: { path: { id } }, body }))
}

export function setCompanyActive(id: number, value: boolean): Promise<CompanyResponse> {
  return unwrap(api.PUT('/api/companies/{id}/active', { params: { path: { id }, query: { value } } }))
}

export function setCompanyNpKey(id: number, body: NovaPoshtaKeyRequest): Promise<CompanyResponse> {
  return unwrap(api.PUT('/api/companies/{id}/nova-poshta', { params: { path: { id } }, body }))
}

export function syncNovaPoshta(): Promise<SyncResult> {
  return unwrap(api.POST('/api/nova-poshta/sync'))
}
