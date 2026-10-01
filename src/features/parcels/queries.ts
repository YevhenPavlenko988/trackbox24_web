import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientKeys } from '@/features/clients/queries'
import type { ParcelCreateRequest, ParcelResponse, ParcelStatusChangeRequest, ParcelUpdateRequest } from '@/lib/api/types'
import {
  changeParcelStatus,
  createParcel,
  getParcel,
  getParcelHistory,
  listParcels,
  refreshParcelFromNp,
  updateParcel,
  type ParcelListParams,
} from './api'

export const parcelKeys = {
  all: ['parcels'] as const,
  list: (params: ParcelListParams) => ['parcels', 'list', params] as const,
  detail: (id: number) => ['parcels', 'detail', id] as const,
  history: (id: number) => ['parcels', 'detail', id, 'history'] as const,
}

export function useParcels(params: ParcelListParams) {
  return useQuery({
    queryKey: parcelKeys.list(params),
    queryFn: () => listParcels(params),
    placeholderData: keepPreviousData,
  })
}

export function useParcel(id: number) {
  return useQuery({ queryKey: parcelKeys.detail(id), queryFn: () => getParcel(id) })
}

export function useParcelHistory(id: number) {
  return useQuery({ queryKey: parcelKeys.history(id), queryFn: () => getParcelHistory(id) })
}

function useParcelMutation<TVars>(mutationFn: (vars: TVars) => Promise<ParcelResponse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (parcel) => {
      if (parcel.id != null) queryClient.setQueryData(parcelKeys.detail(parcel.id), parcel)
      queryClient.invalidateQueries({ queryKey: parcelKeys.all })
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
    },
  })
}

export function useCreateParcel() {
  return useParcelMutation((body: ParcelCreateRequest) => createParcel(body))
}

export function useUpdateParcel(id: number) {
  return useParcelMutation((body: ParcelUpdateRequest) => updateParcel(id, body))
}

export function useChangeParcelStatus(id: number) {
  return useParcelMutation((body: ParcelStatusChangeRequest) => changeParcelStatus(id, body))
}

export function useRefreshParcelFromNp(id: number) {
  return useParcelMutation(() => refreshParcelFromNp(id))
}
