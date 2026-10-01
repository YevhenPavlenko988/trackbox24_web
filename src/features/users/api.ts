import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type { NovaPoshtaKeyRequest, Role, UserCreateRequest, UserResponse, UserUpdateRequest } from '@/lib/api/types'

export type UserListParams = PageParams & { role?: Role; companyId?: number }

export async function listUsers(params: UserListParams): Promise<Page<UserResponse>> {
  const data = await unwrap(
    api.GET('/api/users', {
      params: {
        query: {
          role: params.role,
          companyId: params.companyId,
          page: params.page,
          size: params.size,
          sort: [params.sort ?? 'lastName,asc'],
        },
      },
    }),
  )
  return normalizePage(data)
}

export function getUser(id: number): Promise<UserResponse> {
  return unwrap(api.GET('/api/users/{id}', { params: { path: { id } } }))
}

export function createUser(body: UserCreateRequest): Promise<UserResponse> {
  return unwrap(api.POST('/api/users', { body }))
}

export function updateUser(id: number, body: UserUpdateRequest): Promise<UserResponse> {
  return unwrap(api.PUT('/api/users/{id}', { params: { path: { id } }, body }))
}

export function setUserNovaPoshta(id: number, body: NovaPoshtaKeyRequest): Promise<UserResponse> {
  return unwrap(api.PUT('/api/users/{id}/nova-poshta', { params: { path: { id } }, body }))
}

export function userDisplayName(u: UserResponse | undefined): string {
  if (!u) return '—'
  return [u.lastName, u.firstName].filter(Boolean).join(' ') || u.email || '—'
}
