import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parcelKeys } from '@/features/parcels/queries'
import { tripKeys } from '@/features/trips/queries'
import type { PageParams } from '@/lib/api/page'
import type { RouteRequest, TripRequest } from '@/lib/api/types'
import { addRouteLeg, createRoute, getRoute, getRouteParcels, listRoutes, planRouteParcels, unplanRouteParcel } from './api'

export const routeKeys = {
  all: ['routes'] as const,
  list: (params: PageParams) => ['routes', 'list', params] as const,
  detail: (id: number) => ['routes', 'detail', id] as const,
  parcels: (id: number) => ['routes', 'detail', id, 'parcels'] as const,
}

/** A route's change moves its legs and its cargo too. */
function useInvalidateRoutes() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: routeKeys.all })
    queryClient.invalidateQueries({ queryKey: tripKeys.all })
    queryClient.invalidateQueries({ queryKey: parcelKeys.all })
  }
}

export function useRoutes(params: PageParams) {
  return useQuery({ queryKey: routeKeys.list(params), queryFn: () => listRoutes(params), placeholderData: keepPreviousData })
}

export function useRoute(id: number) {
  return useQuery({ queryKey: routeKeys.detail(id), queryFn: () => getRoute(id) })
}

export function useRouteParcels(id: number) {
  return useQuery({ queryKey: routeKeys.parcels(id), queryFn: () => getRouteParcels(id) })
}

export function useCreateRoute() {
  const invalidate = useInvalidateRoutes()
  return useMutation({ mutationFn: (body: RouteRequest) => createRoute(body), onSuccess: invalidate })
}

export function useAddRouteLeg(id: number) {
  const invalidate = useInvalidateRoutes()
  return useMutation({ mutationFn: (body: TripRequest) => addRouteLeg(id, body), onSuccess: invalidate })
}

export function usePlanRouteParcels(id: number) {
  const invalidate = useInvalidateRoutes()
  return useMutation({ mutationFn: (ids: number[]) => planRouteParcels(id, ids), onSuccess: invalidate })
}

export function useUnplanRouteParcel(id: number) {
  const invalidate = useInvalidateRoutes()
  return useMutation({ mutationFn: (parcelId: number) => unplanRouteParcel(id, parcelId), onSuccess: invalidate })
}
