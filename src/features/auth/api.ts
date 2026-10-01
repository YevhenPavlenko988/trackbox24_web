import { api } from '@/lib/api/client'
import { toApiError, unwrap } from '@/lib/api/problem'
import type { ChangePasswordRequest, LoginRequest, TokenResponse, UserResponse } from '@/lib/api/types'

export async function login(body: LoginRequest): Promise<TokenResponse> {
  const { data, error, response } = await api.POST('/api/auth/login', { body })
  if (!response.ok) throw toApiError(error, response)
  return data as TokenResponse
}

export function fetchMe(): Promise<UserResponse> {
  return unwrap(api.GET('/api/auth/me'))
}

/** Returns a fresh token; every other session of the user is revoked. */
export function changePassword(body: ChangePasswordRequest): Promise<TokenResponse> {
  return unwrap(api.POST('/api/auth/password', { body }))
}
