import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parcelKeys } from '@/features/parcels/queries'
import type { TripCompleteRequest, TripDepartRequest, TripRequest } from '@/lib/api/types'
import {
  cancelTrip,
  completeTrip,
  createTrip,
  departTrip,
  getTrip,
  getTripHistory,
  getTripParcels,
  listTrips,
  planTripParcels,
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

export function useDepartTrip(id: number) {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (body: TripDepartRequest) => departTrip(id, body), onSuccess: invalidate })
}

export function useCompleteTrip(id: number) {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (body: TripCompleteRequest) => completeTrip(id, body), onSuccess: invalidate })
}

export function useCancelTrip(id: number) {
  const invalidate = useInvalidateTrips()
  return useMutation({ mutationFn: (warehouseId?: number) => cancelTrip(id, warehouseId), onSuccess: invalidate })
}
