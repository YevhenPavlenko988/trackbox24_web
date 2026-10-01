import { Navigate, Outlet, useLocation } from 'react-router'
import { useAccess, type Access } from '@/features/auth/access'
import { useAuth } from '@/features/auth/useAuth'
import { ForbiddenPage, MobileOnlyPage } from './ErrorPages'

export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** Company operational pages: managers, viewers, or an admin browsing a company. */
export function RequireCompanyAccess() {
  const access = useAccess()
  if (access.hasCompanyAccess) return <Outlet />
  return access.mobileOnly ? <MobileOnlyPage /> : <ForbiddenPage />
}

export function RequireAdmin() {
  const { isAdmin } = useAccess()
  return isAdmin ? <Outlet /> : <ForbiddenPage />
}

export function RedirectIfAuthenticated() {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

export function homePathFor(access: Access): string {
  if (access.isAdmin && !access.companyMode) return '/companies'
  if (access.mobileOnly) return '/mobile-only'
  return '/parcels'
}

export function HomeRedirect() {
  const access = useAccess()
  return <Navigate to={homePathFor(access)} replace />
}
