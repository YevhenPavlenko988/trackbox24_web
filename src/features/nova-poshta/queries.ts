import { useQuery } from '@tanstack/react-query'
import { searchNpBranches, searchNpCities, searchNpStreets, type NpBranchType } from './api'

/** Nova Poshta directories are searched live, so a query only runs once there is something to search for. */
export const MIN_QUERY = 2

export const npKeys = {
  cities: (query: string) => ['nova-poshta', 'cities', query] as const,
  branches: (cityRef: string, query: string, type: NpBranchType) => ['nova-poshta', 'branches', cityRef, type, query] as const,
  streets: (cityRef: string, query: string) => ['nova-poshta', 'streets', cityRef, query] as const,
}

export function useNpCities(query: string, enabled: boolean) {
  return useQuery({
    queryKey: npKeys.cities(query),
    queryFn: () => searchNpCities(query),
    enabled: enabled && query.trim().length >= MIN_QUERY,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
}

/** The branch list of a city is worth showing without a query, so an empty one is allowed here. */
export function useNpBranches(cityRef: string | undefined, query: string, type: NpBranchType, enabled: boolean) {
  return useQuery({
    queryKey: npKeys.branches(cityRef ?? '', query, type),
    queryFn: () => searchNpBranches(cityRef!, query, type),
    enabled: enabled && !!cityRef,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
}

export function useNpStreets(cityRef: string | undefined, query: string, enabled: boolean) {
  return useQuery({
    queryKey: npKeys.streets(cityRef ?? '', query),
    queryFn: () => searchNpStreets(cityRef!, query),
    enabled: enabled && !!cityRef && query.trim().length >= MIN_QUERY,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
}
