import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parcelKeys } from '@/features/parcels/queries'
import type { PageParams } from '@/lib/api/page'
import type { ActualShipmentCompleteRequest, ActualShipmentStartRequest, PlannedShipmentRequest } from '@/lib/api/types'
import {
  addPlannedParcels,
  cancelActual,
  cancelPlanned,
  completeActual,
  confirmPlanned,
  createPlanned,
  getActual,
  getActualParcels,
  getPlanned,
  getPlannedParcels,
  listActual,
  listPlanned,
  removePlannedParcel,
  startActual,
  updatePlanned,
} from './api'

export const plannedKeys = {
  all: ['planned-shipments'] as const,
  list: (params: PageParams) => ['planned-shipments', 'list', params] as const,
  detail: (id: number) => ['planned-shipments', 'detail', id] as const,
  parcels: (id: number) => ['planned-shipments', 'detail', id, 'parcels'] as const,
}

export const actualKeys = {
  all: ['actual-shipments'] as const,
  list: (params: PageParams) => ['actual-shipments', 'list', params] as const,
  detail: (id: number) => ['actual-shipments', 'detail', id] as const,
  parcels: (id: number) => ['actual-shipments', 'detail', id, 'parcels'] as const,
}

function useInvalidateShipments() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: plannedKeys.all })
    queryClient.invalidateQueries({ queryKey: actualKeys.all })
    queryClient.invalidateQueries({ queryKey: parcelKeys.all })
  }
}

// ----- planned -----

export function usePlannedShipments(params: PageParams) {
  return useQuery({ queryKey: plannedKeys.list(params), queryFn: () => listPlanned(params), placeholderData: keepPreviousData })
}

export function usePlannedShipment(id: number) {
  return useQuery({ queryKey: plannedKeys.detail(id), queryFn: () => getPlanned(id) })
}

export function usePlannedParcels(id: number) {
  return useQuery({ queryKey: plannedKeys.parcels(id), queryFn: () => getPlannedParcels(id) })
}

export function useCreatePlanned() {
  const invalidate = useInvalidateShipments()
  return useMutation({ mutationFn: (body: PlannedShipmentRequest) => createPlanned(body), onSuccess: invalidate })
}

export function useUpdatePlanned(id: number) {
  const invalidate = useInvalidateShipments()
  return useMutation({ mutationFn: (body: PlannedShipmentRequest) => updatePlanned(id, body), onSuccess: invalidate })
}

export function useConfirmPlanned(id: number) {
  const invalidate = useInvalidateShipments()
  return useMutation({ mutationFn: () => confirmPlanned(id), onSuccess: invalidate })
}

export function useCancelPlanned(id: number) {
  const invalidate = useInvalidateShipments()
  return useMutation({ mutationFn: () => cancelPlanned(id), onSuccess: invalidate })
}

export function useAddPlannedParcels(id: number) {
  const invalidate = useInvalidateShipments()
  return useMutation({ mutationFn: (parcelIds: number[]) => addPlannedParcels(id, parcelIds), onSuccess: invalidate })
}

export function useRemovePlannedParcel(id: number) {
  const invalidate = useInvalidateShipments()
  return useMutation({ mutationFn: (parcelId: number) => removePlannedParcel(id, parcelId), onSuccess: invalidate })
}

// ----- actual -----

export function useActualShipments(params: PageParams) {
  return useQuery({ queryKey: actualKeys.list(params), queryFn: () => listActual(params), placeholderData: keepPreviousData })
}

export function useActualShipment(id: number) {
  return useQuery({ queryKey: actualKeys.detail(id), queryFn: () => getActual(id) })
}

export function useActualParcels(id: number) {
  return useQuery({ queryKey: actualKeys.parcels(id), queryFn: () => getActualParcels(id) })
}

export function useStartActual() {
  const invalidate = useInvalidateShipments()
  return useMutation({ mutationFn: (body: ActualShipmentStartRequest) => startActual(body), onSuccess: invalidate })
}

export function useCompleteActual(id: number) {
  const invalidate = useInvalidateShipments()
  return useMutation({ mutationFn: (body: ActualShipmentCompleteRequest) => completeActual(id, body), onSuccess: invalidate })
}

export function useCancelActual(id: number) {
  const invalidate = useInvalidateShipments()
  return useMutation({ mutationFn: () => cancelActual(id), onSuccess: invalidate })
}
