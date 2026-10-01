import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/useAuth'
import type { Role } from '@/lib/api/types'
import { ForbiddenPage } from './ErrorPages'

export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { role } = useAuth()
  if (!role || !roles.includes(role)) return <ForbiddenPage />
  return <Outlet />
}

export function RedirectIfAuthenticated() {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

export function homePathFor(role?: Role): string {
  return role === 'ADMIN' ? '/companies' : '/parcels'
}

export function HomeRedirect() {
  const { role } = useAuth()
  return <Navigate to={homePathFor(role)} replace />
}
