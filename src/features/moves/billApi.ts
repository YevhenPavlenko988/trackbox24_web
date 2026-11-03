import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parcelKeys } from '@/features/parcels/queries'
import { api } from '@/lib/api/client'
import { unwrap } from '@/lib/api/problem'
import type { Currency, MoveBillResponse, MovePaymentRequest, MoveStorageRequest, MoveWorkFactRequest, MoveWorkRequest } from '@/lib/api/types'

const billKey = (id: number) => ['moves', 'bill', id] as const
const path = (id: number) => ({ params: { path: { id } } })

export function useMoveBill(id: number) {
  return useQuery({ queryKey: billKey(id), queryFn: () => unwrap(api.GET('/api/parcels/{id}/bill', path(id))) })
}

/** The bill shown in another currency (the final bill for the client) at the company's rate now; «Курси валют» only. */
export function useMoveBillIn(id: number, shown: Currency | undefined) {
  return useQuery({
    queryKey: [...billKey(id), shown ?? 'own'] as const,
    queryFn: () => unwrap(api.GET('/api/parcels/{id}/bill', { params: { path: { id }, query: shown ? { in: shown } : {} } })),
  })
}

/** Every change answers with the whole bill; it replaces the cached one, and the parcel's price may have changed. */
function useBillMutation<A>(id: number, fn: (arg: A) => Promise<MoveBillResponse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (bill) => {
      queryClient.setQueryData(billKey(id), bill)
      // the same bill shown in other currencies
      queryClient.invalidateQueries({ queryKey: billKey(id), exact: false, predicate: (q) => q.queryKey.length > 3 })
      queryClient.invalidateQueries({ queryKey: parcelKeys.detail(id) })
    },
  })
}

export const useSetBillCurrency = (id: number) =>
  useBillMutation(id, (value: Currency) => unwrap(api.PUT('/api/parcels/{id}/bill/currency', { params: { path: { id }, query: { value } } })))

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

/** The client's bill in Excel, the same one the mobile app sends; its sums are formulas a manager can correct. */
export async function downloadInvoiceXlsx(id: number, filename: string, shown?: Currency): Promise<void> {
  const blob = await unwrap(api.GET('/api/parcels/{id}/invoice.xlsx', { params: { path: { id }, query: shown ? { in: shown } : {} }, parseAs: 'blob' }))
  const url = URL.createObjectURL(blob as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
