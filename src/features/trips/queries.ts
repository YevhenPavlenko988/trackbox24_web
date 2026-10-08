import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loadParcelIntoTrip } from '@/features/parcels/api'
import { parcelKeys } from '@/features/parcels/queries'
import type { PageParams } from '@/lib/api/page'
import type { ParcelResponse, TripCompleteRequest, TripDepartRequest, TripRequest } from '@/lib/api/types'
import {
  cancelTrip,
  completeTrip,
  createTrip,
  deleteTrip,
  departTrip,
  getTrip,
  getTripHistory,
  getTripParcels,
  listTrips,
  listDeletedTrips,
  planTripParcels,
  restoreTrip,
  startLoadingTrip,
  unplanTripParcel,
  updateTrip,
  type TripListParams,
} from './api'

export const tripKeys = {
  all: ['trips'] as const,
  list: (params: TripListParams) => ['trips', 'list', params] as const,
  detail: (id: number) => ['trips', 'detail', id] as const,
  parcels: (id: number) => ['trips', 'detail', id, 'parcels'] as const,
  history: (id: number) => ['trips', 'detail', id, 'history'] as const,
  deleted: (params: PageParams) => ['trips', 'deleted', params] as const,
}

function useInvalidateTrips() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: tripKeys.all })
    queryClient.invalidateQueries({ queryKey: parcelKeys.all })
  }
}

export function useTrips(params: TripListParams) {
  return useQuery({ queryKey: tripKeys.list(params), queryFn: () => listTrips(params), placeholderData: keepPreviousData })
}

export function useTrip(id: number) {
  return useQuery({ queryKey: tripKeys.detail(id), queryFn: () => getTrip(id) })
}

export function useTripParcels(id: number) {
  return useQuery({ queryKey: tripKeys.parcels(id), queryFn: () => getTripParcels(id) })
}

export function useTripHistory(id: number) {
  return useQuery({ queryKey: tripKeys.history(id), queryFn: () => getTripHistory(id) })
}

export function useCreateTrip() {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (body: TripRequest) => createTrip(body), onSuccess: invalidate })
}

export function useUpdateTrip(id: number) {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (body: TripRequest) => updateTrip(id, body), onSuccess: invalidate })
}

export function usePlanTripParcels(id: number) {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (parcelIds: number[]) => planTripParcels(id, parcelIds), onSuccess: invalidate })
}

export function useUnplanTripParcel(id: number) {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (parcelId: number) => unplanTripParcel(id, parcelId), onSuccess: invalidate })
}

export function useStartLoadingTrip(id: number) {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: () => startLoadingTrip(id), onSuccess: invalidate })
}

export function useDepartTrip(id: number) {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (body: TripDepartRequest) => departTrip(id, body), onSuccess: invalidate })
}

export function useCompleteTrip(id: number) {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (body: TripCompleteRequest) => completeTrip(id, body), onSuccess: invalidate })
}

export function useDeleteTrip() {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (id: number) => deleteTrip(id), onSuccess: invalidate })
}

export function useRestoreTrip() {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (id: number) => restoreTrip(id), onSuccess: invalidate })
}

export function useDeletedTrips(params: PageParams) {
  return useQuery({ queryKey: tripKeys.deleted(params), queryFn: () => listDeletedTrips(params), placeholderData: keepPreviousData })
}

export function useCancelTrip(id: number) {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (warehouseId?: number) => cancelTrip(id, warehouseId), onSuccess: invalidate })
}

/** Lives here because loading changes both the parcel and the trip it joins. */
export function useLoadParcelIntoTrip() {
  const invalidate = useInvalidateTrips()
  return useMutation({
    mutationFn: ({ parcel, tripId, comment }: { parcel: ParcelResponse; tripId: number; comment?: string }) =>
      loadParcelIntoTrip(parcel, tripId, comment),
    onSuccess: invalidate,
  })
}
