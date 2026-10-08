import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Role, UserResponse } from '@/lib/api/types'
import { fetchMe } from './api'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/lib/api/problem'
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
    // A rejected token is final; anything else (backend restarting, no network) is worth another try.
    retry: (count, e) => !isApiError(e) || e.status !== 401 ? count < 3 : false,
    retryDelay: (count) => Math.min(1000 * 2 ** count, 8000),
    staleTime: Infinity,
  })

  // Only the backend saying "this token is not valid" ends the session: a 502 while it restarts must not log out.
  const sessionBroken = !!token && isApiError(meQuery.error) && meQuery.error.status === 401
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

  // The token is fine, the backend is not: wait here instead of dropping the user on the login page.
  if (token && !sessionBroken && meQuery.isError) {
    return <ServerUnavailable onRetry={() => void meQuery.refetch()} pending={meQuery.isFetching} />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function ServerUnavailable({ onRetry, pending }: { onRetry: () => void; pending: boolean }) {
  const { t } = useTranslation('common')
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg font-medium">{t('serverDown.title')}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{t('serverDown.hint')}</p>
      <Button onClick={onRetry} disabled={pending}>
        {t('actions.retry')}
      </Button>
    </div>
  )
}
