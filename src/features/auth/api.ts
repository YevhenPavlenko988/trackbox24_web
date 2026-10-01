import { api } from '@/lib/api/client'
import { toApiError, unwrap } from '@/lib/api/problem'
import type { LoginRequest, UserResponse } from '@/lib/api/types'

// Login 200 is not declared in the OpenAPI spec, so the shape is typed by hand.
export type TokenResponse = {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export async function login(body: LoginRequest): Promise<TokenResponse> {
  const { data, error, response } = await api.POST('/api/auth/login', { body })
  if (!response.ok) throw toApiError(error, response)
  return data as unknown as TokenResponse
}

export function fetchMe(): Promise<UserResponse> {
  return unwrap(api.GET('/api/auth/me'))
}
