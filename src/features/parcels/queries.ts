import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientKeys } from '@/features/clients/queries'
import type { PageParams } from '@/lib/api/page'
import type { SeatCheckStage, NpShipmentRequest, ParcelCreateRequest, ParcelPaymentRequest, ParcelPhotoResponse, ParcelResponse, ParcelStatusChangeRequest, ParcelUpdateRequest } from '@/lib/api/types'
import {
  changeParcelStatus,
  createNpWaybill,
  createParcel,
  deleteNpWaybill,
  deleteParcel,
  updateNpShipment,
  getParcel,
  getParcelHistory,
  listDeletedParcels,
  listParcels,
  refreshParcelFromNp,
  syncNovaPoshta,
  restoreParcel,
  setParcelPayment,
  updateParcel,
  addParcelPhotos,
  addSeats,
  checkSeats,
  describeSeat,
  finishSeatCheck,
  deleteParcelPhoto,
  listParcelPhotos,
  type ParcelListParams,
} from './api'

export const parcelKeys = {
  all: ['parcels'] as const,
  list: (params: ParcelListParams) => ['parcels', 'list', params] as const,
  detail: (id: number) => ['parcels', 'detail', id] as const,
  history: (id: number) => ['parcels', 'detail', id, 'history'] as const,
  photos: (id: number) => ['parcels', 'detail', id, 'photos'] as const,
  deleted: (params: PageParams) => ['parcels', 'deleted', params] as const,
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

export function useDeleteParcel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteParcel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parcelKeys.all })
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
    },
  })
}

export function useRestoreParcel() {
  return useParcelMutation((id: number) => restoreParcel(id))
}

export function useDeletedParcels(params: PageParams) {
  return useQuery({ queryKey: parcelKeys.deleted(params), queryFn: () => listDeletedParcels(params), placeholderData: keepPreviousData })
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

export function useSyncNovaPoshta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: syncNovaPoshta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parcelKeys.all })
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
    },
  })
}

export function useUpdateNpShipment(id: number) {
  return useParcelMutation((body: NpShipmentRequest) => updateNpShipment(id, body))
}

export function useCreateNpWaybill(id: number) {
  return useParcelMutation(() => createNpWaybill(id))
}

export function useDeleteNpWaybill(id: number) {
  return useParcelMutation(() => deleteNpWaybill(id))
}

export function useSetParcelPayment(id: number) {
  return useParcelMutation((body: ParcelPaymentRequest) => setParcelPayment(id, body))
}

/** Links inside expire in an hour; refetching on focus/mount is cheap and keeps them fresh for an open tab. */
export function useParcelPhotos(id: number, enabled = true) {
  return useQuery({ queryKey: parcelKeys.photos(id), queryFn: () => listParcelPhotos(id), enabled, staleTime: 5 * 60 * 1000 })
}

export function useAddParcelPhotos(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ files, seatNumber }: { files: File[]; seatNumber?: number }) => addParcelPhotos(id, files, seatNumber),
    onSuccess: (added) => {
      queryClient.setQueryData<ParcelPhotoResponse[]>(parcelKeys.photos(id), (old) => [...(old ?? []), ...added])
      queryClient.invalidateQueries({ queryKey: parcelKeys.history(id) })
    },
  })
}

export function useDeleteParcelPhoto(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (photoId: number) => deleteParcelPhoto(id, photoId),
    onSuccess: (_, photoId) => {
      queryClient.setQueryData<ParcelPhotoResponse[]>(parcelKeys.photos(id), (old) => (old ?? []).filter((ph) => ph.id !== photoId))
      queryClient.invalidateQueries({ queryKey: parcelKeys.history(id) })
    },
  })
}

// ---------------------------------------------------------------- seats (moves)

/** A change to the seats changes the parcel and adds to its history. */
function useSeatMutation<A, R>(id: number, fn: (arg: A) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parcelKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: ['parcels', 'list'] })
    },
  })
}

export const useDescribeSeat = (id: number) =>
  useSeatMutation(id, ({ seatNumber, description }: { seatNumber: number; description: string }) => describeSeat(id, seatNumber, description))

export const useAddSeats = (id: number) => useSeatMutation(id, (descriptions: string[]) => addSeats(id, descriptions))

export const useSeatCheck = (id: number, stage: SeatCheckStage, warehouseId?: number, enabled = true) =>
  useQuery({ queryKey: [...parcelKeys.detail(id), 'check', stage, warehouseId], queryFn: () => checkSeats(id, stage, warehouseId), enabled })

export const useFinishSeatCheck = (id: number) =>
  useSeatMutation(id, (body: { stage: SeatCheckStage; warehouseId?: number; comment?: string }) => finishSeatCheck(id, body))
