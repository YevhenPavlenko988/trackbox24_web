import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getViewCompanyId } from '@/features/auth/companyView'
import type { NovaPoshtaKeyRequest, Role, UserCreateRequest, UserResponse, UserUpdateRequest } from '@/lib/api/types'
import { createUser, listUsers, resetUserPassword, setUserNovaPoshta, updateUser, type UserListParams } from './api'

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

/**
 * Users with a role, for pickers; a platform admin in company mode must pass the company explicitly.
 * The picker has no search, so everyone with the role has to be in it: a page of 100 silently dropped the rest.
 */
export function useUsersByRole(role: Role) {
  const params: UserListParams = { role, companyId: getViewCompanyId() ?? undefined, size: 500 }
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
    staleTime: 5 * 60 * 1000,
  })
}

function useUserMutation<TVars, TResult = UserResponse>(mutationFn: (vars: TVars) => Promise<TResult>) {
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

export function useResetUserPassword(id: number) {
  return useUserMutation((newPassword: string) => resetUserPassword(id, newPassword))
}
