import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NovaPoshtaKeyRequest, Role, UserCreateRequest, UserResponse, UserUpdateRequest } from '@/lib/api/types'
import { createUser, listUsers, setUserNovaPoshta, updateUser, type UserListParams } from './api'

export const userKeys = {
  all: ['users'] as const,
  list: (params: UserListParams) => ['users', 'list', params] as const,
}

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
    placeholderData: keepPreviousData,
  })
}

export function useUsersByRole(role: Role, companyId?: number) {
  const params: UserListParams = { role, companyId, size: 100 }
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
    staleTime: 5 * 60 * 1000,
  })
}

function useUserMutation<TVars>(mutationFn: (vars: TVars) => Promise<UserResponse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useCreateUser() {
  return useUserMutation((body: UserCreateRequest) => createUser(body))
}

export function useUpdateUser(id: number) {
  return useUserMutation((body: UserUpdateRequest) => updateUser(id, body))
}

export function useSetUserNovaPoshta(id: number) {
  return useUserMutation((body: NovaPoshtaKeyRequest) => setUserNovaPoshta(id, body))
}
