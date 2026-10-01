import { useQuery } from '@tanstack/react-query'
import { listUsers, type UserListParams } from './api'

export const userKeys = {
  all: ['users'] as const,
  list: (params: UserListParams) => ['users', 'list', params] as const,
}

export function useRepresentatives() {
  const params: UserListParams = { role: 'REPRESENTATIVE', size: 100 }
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
    staleTime: 5 * 60 * 1000,
  })
}
