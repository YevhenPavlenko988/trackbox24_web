import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageParams } from '@/lib/api/page'
import type { CompanyRequest, CompanyResponse, NovaPoshtaKeyRequest } from '@/lib/api/types'
import { parcelKeys } from '@/features/parcels/queries'
import {
  createCompany,
  getCompany,
  listCompanies,
  setCompanyActive,
  setCompanyNpKey,
  syncNovaPoshta,
  updateCompany,
} from './api'

export const companyKeys = {
  all: ['companies'] as const,
  list: (params: PageParams) => ['companies', 'list', params] as const,
  detail: (id: number) => ['companies', 'detail', id] as const,
}

export function useCompanies(params: PageParams) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: () => listCompanies(params),
    placeholderData: keepPreviousData,
  })
}

export function useCompany(id: number | undefined) {
  return useQuery({
    queryKey: companyKeys.detail(id ?? 0),
    queryFn: () => getCompany(id!),
    enabled: id != null,
  })
}

function useCompanyMutation<TVars>(mutationFn: (vars: TVars) => Promise<CompanyResponse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (company) => {
      if (company.id != null) queryClient.setQueryData(companyKeys.detail(company.id), company)
      queryClient.invalidateQueries({ queryKey: companyKeys.all })
    },
  })
}

export function useCreateCompany() {
  return useCompanyMutation((body: CompanyRequest) => createCompany(body))
}

export function useUpdateCompany(id: number) {
  return useCompanyMutation((body: CompanyRequest) => updateCompany(id, body))
}

export function useSetCompanyActive(id: number) {
  return useCompanyMutation((value: boolean) => setCompanyActive(id, value))
}

export function useSetCompanyNpKey(id: number) {
  return useCompanyMutation((body: NovaPoshtaKeyRequest) => setCompanyNpKey(id, body))
}

export function useSyncNovaPoshta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: syncNovaPoshta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parcelKeys.all }),
  })
}
