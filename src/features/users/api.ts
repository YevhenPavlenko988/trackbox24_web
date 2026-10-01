import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type { Role, UserResponse } from '@/lib/api/types'

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

export function userDisplayName(u: UserResponse | undefined): string {
  if (!u) return '—'
  return [u.lastName, u.firstName].filter(Boolean).join(' ') || u.email || '—'
}
