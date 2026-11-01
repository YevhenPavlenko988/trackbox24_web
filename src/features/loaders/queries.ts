import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LoaderRequest } from '@/lib/api/types'
import { createLoader, listLoaders, updateLoader } from './api'

export const loaderKeys = { all: ['loaders'] as const }

export function useLoaders() {
  return useQuery({ queryKey: loaderKeys.all, queryFn: listLoaders })
}

export function useCreateLoader() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (body: LoaderRequest) => createLoader(body), onSuccess: () => queryClient.invalidateQueries({ queryKey: loaderKeys.all }) })
}

export function useUpdateLoader(id: number) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (body: LoaderRequest) => updateLoader(id, body), onSuccess: () => queryClient.invalidateQueries({ queryKey: loaderKeys.all }) })
}
