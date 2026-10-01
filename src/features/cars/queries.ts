import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageParams } from '@/lib/api/page'
import type { CarRequest } from '@/lib/api/types'
import { createCar, listCars, updateCar } from './api'

export const carKeys = {
  all: ['cars'] as const,
  list: (params: PageParams) => ['cars', 'list', params] as const,
}

export function useCars(params: PageParams) {
  return useQuery({
    queryKey: carKeys.list(params),
    queryFn: () => listCars(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateCar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CarRequest) => createCar(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: carKeys.all }),
  })
}

export function useUpdateCar(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CarRequest) => updateCar(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: carKeys.all }),
  })
}
