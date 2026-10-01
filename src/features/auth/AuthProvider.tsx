import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Role, UserResponse } from '@/lib/api/types'
import { fetchMe } from './api'
import { clearToken, getToken, setToken } from './token'

export type AuthContextValue = {
  user: UserResponse | null
  roles: Role[]
  companyId?: number
  login: (accessToken: string) => Promise<void>
  /** Swap the token without re-fetching `me` (after changing own password). */
  replaceToken: (accessToken: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const ME_QUERY_KEY = ['me'] as const

const NO_ROLES: Role[] = []

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setTokenState] = useState(getToken)

  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  })

  const sessionBroken = !!token && meQuery.isError
  useEffect(() => {
    if (sessionBroken) clearToken()
  }, [sessionBroken])

  // Prefetch `me` before flipping the token state so the router is never unmounted behind a spinner.
  const login = useCallback(
    async (accessToken: string) => {
      setToken(accessToken)
      try {
        await queryClient.fetchQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe })
      } catch (e) {
        clearToken()
        throw e
      }
      setTokenState(accessToken)
    },
    [queryClient],
  )

  const replaceToken = useCallback((accessToken: string) => {
    setToken(accessToken)
    setTokenState(accessToken)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    queryClient.clear()
  }, [queryClient])

  const user = token && !sessionBroken && meQuery.data ? meQuery.data : null

  const value = useMemo<AuthContextValue>(
    () => ({ user, roles: user?.roles ?? NO_ROLES, companyId: user?.companyId, login, replaceToken, logout }),
    [user, login, replaceToken, logout],
  )

  if (token && meQuery.isPending) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">…</div>
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
