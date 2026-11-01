import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parcelKeys } from '@/features/parcels/queries'
import { api } from '@/lib/api/client'
import { unwrap } from '@/lib/api/problem'
import type { MoveBillResponse, MovePaymentRequest, MoveStorageRequest, MoveWorkFactRequest, MoveWorkRequest } from '@/lib/api/types'

const billKey = (id: number) => ['moves', 'bill', id] as const
const path = (id: number) => ({ params: { path: { id } } })

export function useMoveBill(id: number) {
  return useQuery({ queryKey: billKey(id), queryFn: () => unwrap(api.GET('/api/parcels/{id}/bill', path(id))) })
}

/** Every change answers with the whole bill; it replaces the cached one, and the parcel's price may have changed. */
function useBillMutation<A>(id: number, fn: (arg: A) => Promise<MoveBillResponse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (bill) => {
      queryClient.setQueryData(billKey(id), bill)
      queryClient.invalidateQueries({ queryKey: parcelKeys.detail(id) })
    },
  })
}

export const useSetBillCurrency = (id: number) =>
  useBillMutation(id, (value: 'EUR' | 'UAH') => unwrap(api.PUT('/api/parcels/{id}/bill/currency', { params: { path: { id }, query: { value } } })))

export const useAddWork = (id: number) => useBillMutation(id, (body: MoveWorkRequest) => unwrap(api.POST('/api/parcels/{id}/works', { ...path(id), body })))

export const useUpdateWork = (id: number) =>
  useBillMutation(id, ({ workId, body }: { workId: number; body: MoveWorkRequest }) =>
    unwrap(api.PUT('/api/parcels/{id}/works/{workId}', { params: { path: { id, workId } }, body })),
  )

export const useDeleteWork = (id: number) =>
  useBillMutation(id, (workId: number) => unwrap(api.DELETE('/api/parcels/{id}/works/{workId}', { params: { path: { id, workId } } })))

export const useSetFact = (id: number) =>
  useBillMutation(id, ({ workId, loaderId, body }: { workId: number; loaderId: number; body: MoveWorkFactRequest }) =>
    unwrap(api.PUT('/api/parcels/{id}/works/{workId}/loaders/{loaderId}', { params: { path: { id, workId, loaderId } }, body })),
  )

export const useAddPayment = (id: number) =>
  useBillMutation(id, (body: MovePaymentRequest) => unwrap(api.POST('/api/parcels/{id}/payments', { ...path(id), body })))

export const useDeletePayment = (id: number) =>
  useBillMutation(id, (paymentId: number) => unwrap(api.DELETE('/api/parcels/{id}/payments/{paymentId}', { params: { path: { id, paymentId } } })))

export const useAddStorage = (id: number) =>
  useBillMutation(id, (body: MoveStorageRequest) => unwrap(api.POST('/api/parcels/{id}/storages', { ...path(id), body })))

export const useUpdateStorage = (id: number) =>
  useBillMutation(id, ({ storageId, body }: { storageId: number; body: MoveStorageRequest }) =>
    unwrap(api.PUT('/api/parcels/{id}/storages/{storageId}', { params: { path: { id, storageId } }, body })),
  )

export const useDeleteStorage = (id: number) =>
  useBillMutation(id, (storageId: number) => unwrap(api.DELETE('/api/parcels/{id}/storages/{storageId}', { params: { path: { id, storageId } } })))
