import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parcelKeys } from '@/features/parcels/queries'
import type { WarehouseRequest } from '@/lib/api/types'
import { createWarehouse, listWarehouses, moveParcelsToWarehouse, updateWarehouse, type WarehouseListParams } from './api'

export const warehouseKeys = {
  all: ['warehouses'] as const,
  list: (params: WarehouseListParams) => ['warehouses', 'list', params] as const,
}

export function useWarehouses(params: WarehouseListParams) {
  return useQuery({ queryKey: warehouseKeys.list(params), queryFn: () => listWarehouses(params), placeholderData: keepPreviousData })
}

export function useActiveWarehouses() {
  const params: WarehouseListParams = { active: true, size: 100 }
  return useQuery({ queryKey: warehouseKeys.list(params), queryFn: () => listWarehouses(params), staleTime: 5 * 60 * 1000 })
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (body: WarehouseRequest) => createWarehouse(body), onSuccess: () => queryClient.invalidateQueries({ queryKey: warehouseKeys.all }) })
}

export function useUpdateWarehouse(id: number) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (body: WarehouseRequest) => updateWarehouse(id, body), onSuccess: () => queryClient.invalidateQueries({ queryKey: warehouseKeys.all }) })
}

export function useMoveParcelsToWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ warehouseId, parcelIds, comment }: { warehouseId: number; parcelIds: number[]; comment?: string }) =>
      moveParcelsToWarehouse(warehouseId, parcelIds, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parcelKeys.all })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
