import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ClientRequest } from '@/lib/api/types'
import {
  createClient,
  getClient,
  listClientParcels,
  listClients,
  updateClient,
  type ClientListParams,
  type ClientParcelsParams,
} from './api'

export const clientKeys = {
  all: ['clients'] as const,
  list: (params: ClientListParams) => ['clients', 'list', params] as const,
  detail: (id: number) => ['clients', 'detail', id] as const,
  parcels: (id: number, params: ClientParcelsParams) => ['clients', 'detail', id, 'parcels', params] as const,
}

export function useClients(params: ClientListParams, enabled = true) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => listClients(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useClient(id: number | undefined) {
  return useQuery({
    queryKey: clientKeys.detail(id ?? 0),
    queryFn: () => getClient(id!),
    enabled: id != null,
  })
}

export function useClientParcels(id: number, params: ClientParcelsParams) {
  return useQuery({
    queryKey: clientKeys.parcels(id, params),
    queryFn: () => listClientParcels(id, params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ClientRequest) => createClient(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.all }),
  })
}

export function useUpdateClient(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ClientRequest) => updateClient(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(clientKeys.detail(id), data)
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
    },
  })
}
